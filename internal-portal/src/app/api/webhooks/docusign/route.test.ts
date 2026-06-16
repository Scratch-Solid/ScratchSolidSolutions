import { GET, POST } from './route';
import { NextRequest } from 'next/server';

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
  getCloudflareContext: jest.fn(() => Promise.resolve({ env: {} })),
}));

jest.mock('@/lib/logger', () => ({
  log: {
    audit: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  getEnvVarOptional: jest.fn(() => undefined),
}));

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-trace-id'),
    subtle: {
      importKey: jest.fn(() => Promise.resolve({})),
      sign: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
  },
  writable: true,
});

function createRequest(body: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/docusign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      ...headers,
    },
    body,
  });
}

describe('GET /api/webhooks/docusign', () => {
  test('returns ok status for DocuSign Connect validation', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/docusign');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.endpoint).toBe('/api/webhooks/docusign');
  });
});

describe('POST /api/webhooks/docusign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.first.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({});
  });

  test('handles XML completed envelope and updates training_progress', async () => {
    const xml = `<?xml version="1.0"?>
    <DocuSignEnvelopeInformation>
      <EnvelopeStatus>
        <EnvelopeID>test-env-123</EnvelopeID>
        <Status>Completed</Status>
      </EnvelopeStatus>
    </DocuSignEnvelopeInformation>`;

    mockDb.first
      .mockResolvedValueOnce({ employee_id: 'EMP001', user_id: 42, contract_signed: 0 }) // contract lookup
      .mockResolvedValueOnce(null) // consent lookup
      .mockResolvedValueOnce(null); // new_joiner lookup

    const req = createRequest(xml);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.envelopeId).toBe('test-env-123');

    // Verify database updates were made
    expect(mockDb.run.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('handles JSON completed envelope', async () => {
    const jsonPayload = JSON.stringify({
      envelopeId: 'json-env-456',
      status: 'Completed',
      event: 'EnvelopeComplete',
    });

    mockDb.first
      .mockResolvedValueOnce({ employee_id: 'EMP002', user_id: 99, contract_signed: 0 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const req = createRequest(jsonPayload, { 'Content-Type': 'application/json' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.envelopeId).toBe('json-env-456');
  });

  test('handles declined envelope', async () => {
    const xml = `<?xml version="1.0"?>
    <DocuSignEnvelopeInformation>
      <EnvelopeStatus>
        <EnvelopeID>declined-env-789</EnvelopeID>
        <Status>Declined</Status>
      </EnvelopeStatus>
    </DocuSignEnvelopeInformation>`;

    mockDb.first
      .mockResolvedValueOnce({ employee_id: 'EMP003', user_id: 7 })
      .mockResolvedValueOnce(null);

    const req = createRequest(xml);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('returns 400 for missing envelopeId', async () => {
    const xml = `<?xml version="1.0"?><DocuSignEnvelopeInformation><EnvelopeStatus><Status>Completed</Status></EnvelopeStatus></DocuSignEnvelopeInformation>`;
    const req = createRequest(xml);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 503 when database unavailable', async () => {
    const { getDb } = require('@/lib/db');
    getDb.mockResolvedValueOnce(null);

    const xml = `<?xml version="1.0"?>
    <DocuSignEnvelopeInformation>
      <EnvelopeStatus>
        <EnvelopeID>test-env</EnvelopeID>
        <Status>Completed</Status>
      </EnvelopeStatus>
    </DocuSignEnvelopeInformation>`;

    const req = createRequest(xml);
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
