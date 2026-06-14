/**
 * DocuSign Integration
 * JWT Grant authentication + Envelope creation for cleaner contracts.
 */
import { getEnvVarOptional } from './env';
import { log } from './logger';

const DOCUSIGN_AUTH_SERVER = 'https://account-d.docusign.com';
const DOCUSIGN_PROD_AUTH_SERVER = 'https://account.docusign.com';

function getAuthServer() {
  const baseUrl = getEnvVarOptional('DOCUSIGN_BASE_URL') || '';
  return baseUrl.includes('demo') || baseUrl.includes('docusign.net')
    ? DOCUSIGN_AUTH_SERVER
    : DOCUSIGN_PROD_AUTH_SERVER;
}

function getRestBaseUrl() {
  return (getEnvVarOptional('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net/restapi').replace(/\/$/, '');
}

/**
 * Convert PEM string to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * Import RSA private key from PEM for Web Crypto API
 */
async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate a JWT assertion for DocuSign JWT Grant
 */
async function createJwtAssertion(): Promise<string> {
  const integrationKey = getEnvVarOptional('DOCUSIGN_INTEGRATION_KEY');
  const userId = getEnvVarOptional('DOCUSIGN_USER_ID');
  const privateKeyPem = getEnvVarOptional('DOCUSIGN_PRIVATE_KEY');

  if (!integrationKey || !userId || !privateKeyPem) {
    throw new Error('DocuSign JWT credentials missing: INTEGRATION_KEY, USER_ID, or PRIVATE_KEY');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: getAuthServer(),
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  };

  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header)).buffer
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)).buffer
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importRsaPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Exchange JWT for access token
 */
async function getAccessToken(): Promise<string> {
  const jwt = await createJwtAssertion();
  const response = await fetch(`${getAuthServer()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocuSign OAuth error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface DocusignRecipient {
  email: string;
  name: string;
  recipientId: string;
  routingOrder: string;
  tabs?: {
    signHereTabs?: Array<{
      anchorString?: string;
      anchorXOffset?: string;
      anchorYOffset?: string;
      anchorUnits?: string;
      xPosition?: string;
      yPosition?: string;
      documentId?: string;
      pageNumber?: string;
    }>;
    dateSignedTabs?: Array<{
      anchorString?: string;
      anchorXOffset?: string;
      anchorYOffset?: string;
      documentId?: string;
      pageNumber?: string;
    }>;
  };
}

/**
 * Create a DocuSign envelope with the given document and recipients
 */
export async function createEnvelope(params: {
  subject: string;
  emailBlurb: string;
  documentName: string;
  documentBase64: string;
  documentId?: string;
  recipients: DocusignRecipient[];
}): Promise<{ envelopeId: string; status: string }> {
  const accountId = getEnvVarOptional('DOCUSIGN_ACCOUNT_ID');
  if (!accountId) {
    throw new Error('DOCUSIGN_ACCOUNT_ID not configured');
  }

  const accessToken = await getAccessToken();
  const docId = params.documentId || '1';

  const envelopeDefinition = {
    emailSubject: params.subject,
    emailBlurb: params.emailBlurb,
    status: 'sent',
    documents: [
      {
        documentId: docId,
        name: params.documentName,
        fileExtension: 'html',
        documentBase64: params.documentBase64,
      },
    ],
    recipients: {
      signers: params.recipients.map((r) => ({
        email: r.email,
        name: r.name,
        recipientId: r.recipientId,
        routingOrder: r.routingOrder,
        tabs: r.tabs || {
          signHereTabs: [
            {
              anchorString: '##SIGN_HERE##',
              anchorXOffset: '0',
              anchorYOffset: '0',
              anchorUnits: 'pixels',
              documentId: docId,
              pageNumber: '1',
            },
          ],
          dateSignedTabs: [
            {
              anchorString: '##DATE_SIGNED##',
              anchorXOffset: '0',
              anchorYOffset: '0',
              documentId: docId,
              pageNumber: '1',
            },
          ],
        },
      })),
    },
  };

  const response = await fetch(
    `${getRestBaseUrl()}/restapi/v2.1/accounts/${accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeDefinition),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocuSign envelope creation error (${response.status}): ${text}`);
  }

  const data = await response.json();
  log.audit('DOCUSIGN_ENVELOPE_CREATED', 'cleaner_onboarding', {
    envelopeId: data.envelopeId,
    status: data.status,
  });

  return { envelopeId: data.envelopeId, status: data.status };
}

/**
 * Get a recipient view (signing URL) for an envelope
 */
export async function getSigningUrl(params: {
  envelopeId: string;
  recipientEmail: string;
  recipientName: string;
  clientUserId?: string;
  returnUrl: string;
}): Promise<string> {
  const accountId = getEnvVarOptional('DOCUSIGN_ACCOUNT_ID');
  if (!accountId) {
    throw new Error('DOCUSIGN_ACCOUNT_ID not configured');
  }

  const accessToken = await getAccessToken();

  const response = await fetch(
    `${getRestBaseUrl()}/restapi/v2.1/accounts/${accountId}/envelopes/${params.envelopeId}/views/recipient`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authenticationMethod: 'none',
        email: params.recipientEmail,
        userName: params.recipientName,
        clientUserId: params.clientUserId || params.recipientEmail,
        returnUrl: params.returnUrl,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocuSign signing URL error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.url;
}

/**
 * Check if DocuSign is fully configured with all required secrets
 */
export function isDocusignFullyConfigured(): boolean {
  return Boolean(
    getEnvVarOptional('DOCUSIGN_INTEGRATION_KEY') &&
      getEnvVarOptional('DOCUSIGN_SECRET_KEY') &&
      getEnvVarOptional('DOCUSIGN_ACCOUNT_ID') &&
      getEnvVarOptional('DOCUSIGN_PRIVATE_KEY') &&
      getEnvVarOptional('DOCUSIGN_USER_ID')
  );
}
