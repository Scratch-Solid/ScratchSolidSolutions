import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(),
};

const mockBucket = {
  put: jest.fn(() => Promise.resolve()),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/whatsapp/meta-cloud', () => ({
  getVerifyToken: jest.fn(() => 'test-verify-token'),
  recordInboundMessage: jest.fn(() => Promise.resolve()),
  downloadMediaFromMeta: jest.fn(() =>
    Promise.resolve({
      buffer: new ArrayBuffer(8),
      contentType: 'image/jpeg',
      fileName: 'test.jpg',
    })
  ),
}));

jest.mock('@/lib/runtime-context', () => ({
  getCloudflareContext: jest.fn(() =>
    Promise.resolve({ env: { CLEANER_PHOTOS_BUCKET: mockBucket } })
  ),
}));

function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/webhooks/whatsapp/meta');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: 'GET' });
}

function createPostRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/whatsapp/meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/webhooks/whatsapp/meta', () => {
  test('verifies webhook with correct token', async () => {
    const req = createGetRequest({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test-verify-token',
      'hub.challenge': 'challenge123',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('challenge123');
  });

  test('rejects verification with wrong token', async () => {
    const req = createGetRequest({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong-token',
      'hub.challenge': 'challenge123',
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/webhooks/whatsapp/meta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.first.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({});
  });

  const baseMessagePayload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '27123456789',
            id: 'msg_test_001',
            type: 'text',
            text: { body: 'START' },
          }],
          statuses: [],
        },
      }],
    }],
  };

  test('returns 200 for valid text message', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 1, first_name: 'John', paysheet_code: 'abcX123456' })
      .mockResolvedValueOnce({ id: 1, booking_id: 10, time_slot: '09:00' });

    const req = createPostRequest(baseMessagePayload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('handles fuzzy keyword "I am starting now"', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 1, first_name: 'John', paysheet_code: 'abcX123456' })
      .mockResolvedValueOnce({ id: 1, booking_id: 10, time_slot: '09:00' });

    const payload = JSON.parse(JSON.stringify(baseMessagePayload));
    payload.entry[0].changes[0].value.messages[0].text.body = 'I am starting now';

    const req = createPostRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('handles fuzzy keyword "I have arrived here"', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 1, first_name: 'John', paysheet_code: 'abcX123456' })
      .mockResolvedValueOnce({ id: 1, booking_id: 10, time_slot: '09:00' });

    const payload = JSON.parse(JSON.stringify(baseMessagePayload));
    payload.entry[0].changes[0].value.messages[0].text.body = 'I have arrived here';

    const req = createPostRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('handles fuzzy keyword "Done with cleaning"', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 1, first_name: 'John', paysheet_code: 'abcX123456' })
      .mockResolvedValueOnce({ id: 1, booking_id: 10, time_slot: '09:00' });

    const payload = JSON.parse(JSON.stringify(baseMessagePayload));
    payload.entry[0].changes[0].value.messages[0].text.body = 'Done with cleaning';

    const req = createPostRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('handles image message upload to R2', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 1, first_name: 'John', paysheet_code: 'abcX123456' })
      .mockResolvedValueOnce({ entity_id: 'SS-2024-1234', entity_type: 'job' });

    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '27123456789',
              id: 'msg_img_001',
              type: 'image',
              image: { id: 'media_123', mime_type: 'image/jpeg' },
            }],
            statuses: [],
          },
        }],
      }],
    };

    const req = createPostRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockBucket.put).toHaveBeenCalled();
  });

  test('ignores non-keyword text messages', async () => {
    mockDb.first.mockResolvedValueOnce({ id: 1, first_name: 'John', paysheet_code: 'abcX123456' });

    const payload = JSON.parse(JSON.stringify(baseMessagePayload));
    payload.entry[0].changes[0].value.messages[0].text.body = 'Hello, how are you?';

    const req = createPostRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('returns 200 even for unregistered phone (no crash)', async () => {
    mockDb.first.mockResolvedValueOnce(null);

    const req = createPostRequest(baseMessagePayload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('falls back to jobs table when no booking assignment found', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 1, first_name: 'John', paysheet_code: 'abcX123456' })
      .mockResolvedValueOnce(null) // no booking assignment
      .mockResolvedValueOnce({ entity_id: 'SS-2024-9999', entity_type: 'job', time_slot: '14:00' });

    const req = createPostRequest(baseMessagePayload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
