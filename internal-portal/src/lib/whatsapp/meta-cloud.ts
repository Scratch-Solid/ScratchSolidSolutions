// Meta Cloud API WhatsApp Integration
// Uses WhatsApp Business API (free-tier within 24h conversation window)
// Falls back to Resend email when window is closed.

import { getEnvVarOptional } from '../env';

const META_API_VERSION = getEnvVarOptional('META_API_VERSION') || 'v18.0';
const META_PHONE_NUMBER_ID = getEnvVarOptional('META_PHONE_NUMBER_ID') || '';
const META_ACCESS_TOKEN = getEnvVarOptional('META_ACCESS_TOKEN') || '';
const META_VERIFY_TOKEN = getEnvVarOptional('META_VERIFY_TOKEN') || '';

export function getVerifyToken(): string {
  return META_VERIFY_TOKEN;
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

function getApiUrl(): string {
  return `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
  options?: { templateName?: string; languageCode?: string }
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: number }> {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
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
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${META_ACCESS_TOKEN}`,
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
