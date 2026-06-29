// Meta Cloud API WhatsApp Integration
// Uses WhatsApp Business API (free-tier within 24h conversation window)
// Falls back to Resend email when window is closed.

import { getCloudflareContext } from '../runtime-context';

async function getMetaCreds(): Promise<{
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
}> {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  return {
    apiVersion: (env as any)?.META_API_VERSION || 'v18.0',
    phoneNumberId: (env as any)?.META_PHONE_NUMBER_ID || '',
    accessToken: (env as any)?.META_ACCESS_TOKEN || '',
    verifyToken: (env as any)?.META_VERIFY_TOKEN || '',
  };
}

export async function getVerifyToken(): Promise<string> {
  const { verifyToken } = await getMetaCreds();
  return verifyToken;
}

interface MetaMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'template';
  text?: { body: string; preview_url?: boolean };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
}

async function getApiUrl(): Promise<string> {
  const { apiVersion, phoneNumberId } = await getMetaCreds();
  return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
  options?: { templateName?: string; languageCode?: string }
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: number }> {
  const { accessToken, phoneNumberId } = await getMetaCreds();
  if (!accessToken || !phoneNumberId) {
    return { success: false, error: 'Meta Cloud API credentials not configured' };
  }

  // Normalize phone: strip +, spaces, and whatsapp: prefix
  const normalizedTo = to.replace(/whatsapp:/gi, '').replace(/[\s+]/g, '');

  const payload: MetaMessagePayload = options?.templateName
    ? {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'template',
        template: {
          name: options.templateName,
          language: { code: options.languageCode || 'en' },
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: { body, preview_url: false },
      };

  try {
    const response = await fetch(await getApiUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const metaErrorCode = data.error?.code;
      const metaErrorMessage = data.error?.message || `Meta API error ${response.status}`;
      return {
        success: false,
        error: metaErrorMessage,
        errorCode: metaErrorCode,
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Meta API request failed',
    };
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: any[]
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: number }> {
  return sendWhatsAppMessage(to, '', { templateName, languageCode });
}

/**
 * Check if a conversation window is open (24h from last inbound message).
 * Returns true if we can send free-form messages, false if only templates allowed.
 */
export async function isConversationWindowOpen(
  db: any,
  phoneNumber: string
): Promise<boolean> {
  const session = (await db
    .prepare(
      `SELECT conversation_expires_at
       FROM whatsapp_sessions
       WHERE phone_number = ?
       ORDER BY last_message_at DESC
       LIMIT 1`
    )
    .bind(phoneNumber)
    .first()) as { conversation_expires_at: string } | null;

  if (!session || !session.conversation_expires_at) return false;

  const expiresAt = new Date(session.conversation_expires_at);
  return Date.now() < expiresAt.getTime();
}

/**
 * Record an inbound message and extend the conversation window.
 */
export async function recordInboundMessage(
  db: any,
  phoneNumber: string,
  messageId: string,
  body: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

  await db
    .prepare(
      `INSERT INTO whatsapp_sessions (
        phone_number, conversation_started_at, conversation_expires_at,
        last_message_at, message_count_inbound, window_status
      )
      VALUES (?, ?, ?, ?, 1, 'open')
      ON CONFLICT(phone_number) DO UPDATE SET
        conversation_expires_at = excluded.conversation_expires_at,
        last_message_at = excluded.last_message_at,
        message_count_inbound = message_count_inbound + 1,
        window_status = 'open',
        updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      phoneNumber.replace(/whatsapp:/gi, '').replace(/\s+/g, ''),
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString()
    )
    .run();

  // Also log the message itself (optional - could add a whatsapp_messages table later)
}

/**
 * Download media (image, video, document) from Meta's CDN.
 * Step 1: GET media metadata by media_id
 * Step 2: GET binary from the returned URL
 */
export async function downloadMediaFromMeta(
  mediaId: string
): Promise<{ buffer: ArrayBuffer; contentType: string; fileName: string } | null> {
  const { accessToken, apiVersion } = await getMetaCreds();
  if (!accessToken) {
    console.warn('[Meta Cloud] META_ACCESS_TOKEN not configured');
    return null;
  }

  try {
    // 1. Get media URL
    const infoUrl = `https://graph.facebook.com/${apiVersion}/${mediaId}`;
    const infoResponse = await fetch(infoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!infoResponse.ok) {
      console.warn('[Meta Cloud] Failed to get media URL:', infoResponse.status);
      return null;
    }

    const info = (await infoResponse.json()) as any;
    if (!info.url) {
      console.warn('[Meta Cloud] No download URL in media info');
      return null;
    }

    // 2. Download binary
    const binaryResponse = await fetch(info.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!binaryResponse.ok) {
      console.warn('[Meta Cloud] Failed to download media binary:', binaryResponse.status);
      return null;
    }

    const buffer = await binaryResponse.arrayBuffer();
    const contentType = info.mime_type || binaryResponse.headers.get('content-type') || 'application/octet-stream';
    const fileName = info.file_name || `media_${mediaId}.${mimeToExt(contentType)}`;

    return { buffer, contentType, fileName };
  } catch (error) {
    console.error('[Meta Cloud] Media download error:', error);
    return null;
  }
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
  };
  return map[mime] || 'bin';
}
