import { POST } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/runtime-context', () => ({
  getCloudflareContext: jest.fn(() =>
    Promise.resolve({ env: { INTERNAL_PORTAL_N8N_WEBHOOK_SECRET: 'test-secret-123' } })
  ),
}));

const mockIsWindowOpen = jest.fn();
const mockSendMessage = jest.fn();
const mockSendTemplate = jest.fn();

jest.mock('@/lib/whatsapp/meta-cloud', () => ({
  isConversationWindowOpen: (...args: any[]) => mockIsWindowOpen(...args),
  sendWhatsAppMessage: (...args: any[]) => mockSendMessage(...args),
  sendWhatsAppTemplate: (...args: any[]) => mockSendTemplate(...args),
}));

const mockSendEmail = jest.fn();

jest.mock('@/lib/notifications', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

function createRequest(body: object, authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/n8n/send-whatsapp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader && { Authorization: authHeader }),
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  phone: '+27123456789',
  message: 'Your job is scheduled for tomorrow at 9 AM.',
  fallback_email: 'test@example.com',
  fallback_subject: 'Job Reminder',
  job_id: 'SS-2026-1234',
};

describe('POST /api/webhooks/n8n/send-whatsapp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
    mockIsWindowOpen.mockResolvedValue(true);
    mockSendMessage.mockResolvedValue({ success: true, messageId: 'WA_MSG_001' });
    mockSendTemplate.mockResolvedValue({ success: true, messageId: 'WA_TMPL_001' });
    mockSendEmail.mockResolvedValue(undefined);
  });

  test('returns 401 when Authorization header is missing', async () => {
    const req = createRequest(validPayload);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 400 when phone or message is missing', async () => {
    const req = createRequest({ phone: '+27123456789' }, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing phone or message');
  });

  test('sends WhatsApp message when conversation window is open', async () => {
    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.delivered).toBe(true);
    expect(json.whatsapp.success).toBe(true);
    expect(json.window_open).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledWith('+27123456789', validPayload.message);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test('falls back to email when window is closed (never sends paid templates)', async () => {
    mockIsWindowOpen.mockResolvedValue(false);

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.delivered).toBe(true);
    expect(json.whatsapp.errorCode).toBe(131047);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockSendTemplate).not.toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  test('falls back to email when WhatsApp fails and fallback_email is provided', async () => {
    mockIsWindowOpen.mockResolvedValue(true);
    mockSendMessage.mockResolvedValue({ success: false, error: 'Meta API error 500' });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.delivered).toBe(true);
    expect(json.whatsapp.success).toBe(false);
    expect(json.email_fallback.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalled();
  });

  test('returns 502 when both WhatsApp and email fail', async () => {
    mockIsWindowOpen.mockResolvedValue(true);
    mockSendMessage.mockResolvedValue({ success: false, error: 'Meta API error 500' });
    mockSendEmail.mockRejectedValue(new Error('SMTP timeout'));

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(502);

    const json = await res.json();
    expect(json.delivered).toBe(false);
  });

  test('returns 502 when window is closed and no fallback email available', async () => {
    mockIsWindowOpen.mockResolvedValue(false);

    const req = createRequest(
      { phone: '+27123456789', message: 'Test' }, // no fallback_email
      'Bearer test-secret-123'
    );
    const res = await POST(req);
    expect(res.status).toBe(502);

    const json = await res.json();
    expect(json.delivered).toBe(false);
    expect(json.whatsapp.errorCode).toBe(131047);
  });
});
