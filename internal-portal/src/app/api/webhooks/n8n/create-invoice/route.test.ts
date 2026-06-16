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

const mockFindCustomerByEmail = jest.fn();
const mockCreateCustomer = jest.fn();
const mockCreateInvoice = jest.fn();

jest.mock('@/lib/zoho', () => ({
  findCustomerByEmail: (...args: any[]) => mockFindCustomerByEmail(...args),
  createCustomer: (...args: any[]) => mockCreateCustomer(...args),
  createInvoice: (...args: any[]) => mockCreateInvoice(...args),
}));

function createRequest(body: object, authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/n8n/create-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader && { Authorization: authHeader }),
    },
    body: JSON.stringify(body),
  });
}

const validPayload = { job_id: 'SS-2026-1234' };

describe('POST /api/webhooks/n8n/create-invoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.first.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({});
    mockFindCustomerByEmail.mockResolvedValue(null);
    mockCreateCustomer.mockResolvedValue({ contact: { contact_id: 'Z_CUST_001' } });
    mockCreateInvoice.mockResolvedValue({ invoice: { invoice_id: 'Z_INV_001' } });
  });

  test('returns 401 when Authorization header is missing', async () => {
    const req = createRequest(validPayload);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 400 when job_id is missing', async () => {
    const req = createRequest({}, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing job_id');
  });

  test('returns 404 when job does not exist', async () => {
    mockDb.first.mockResolvedValueOnce(null); // no job

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Job not found');
  });

  test('returns 400 when pricing is not found', async () => {
    mockDb.first
      .mockResolvedValueOnce({ // job
        id: 'SS-2026-1234',
        client_name: 'Jane Client',
        client_email: 'jane@example.com',
        client_phone: '+27123456789',
        property_address: '123 Main St',
        service_type: 'turnover_clean',
        status: 'scheduled',
      })
      .mockResolvedValueOnce(null); // no pricing

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Pricing not found for service type');
  });

  test('creates customer and invoice for valid job', async () => {
    mockDb.first
      .mockResolvedValueOnce({ // job
        id: 'SS-2026-1234',
        client_name: 'Jane Client',
        client_email: 'jane@example.com',
        client_phone: '+27123456789',
        property_address: '123 Main St',
        service_type: 'turnover_clean',
        status: 'scheduled',
      })
      .mockResolvedValueOnce({ // pricing
        base_price: 850.00,
        transport_fee: 150.00,
        weekend_surcharge: 0,
        holiday_surcharge: 0,
      });

    mockFindCustomerByEmail.mockResolvedValue(null);
    mockCreateCustomer.mockResolvedValue({ contact: { contact_id: 'Z_CUST_NEW' } });
    mockCreateInvoice.mockResolvedValue({ invoice: { invoice_id: 'Z_INV_NEW' } });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.job_id).toBe('SS-2026-1234');
    expect(json.zoho_invoice_id).toBe('Z_INV_NEW');
    expect(json.zoho_customer_id).toBe('Z_CUST_NEW');
    expect(json.total_amount_cents).toBe(100000); // 850 + 150 = 1000 ZAR = 100000 cents
    expect(json.customer_created).toBe(true);

    expect(mockCreateCustomer).toHaveBeenCalledWith(
      'Jane Client',
      'jane@example.com',
      '+27123456789',
      '123 Main St'
    );
  });

  test('reuses existing customer when found', async () => {
    mockDb.first
      .mockResolvedValueOnce({
        id: 'SS-2026-1234',
        client_name: 'Jane Client',
        client_email: 'jane@example.com',
        client_phone: '+27123456789',
        property_address: '123 Main St',
        service_type: 'turnover_clean',
        status: 'scheduled',
      })
      .mockResolvedValueOnce({
        base_price: 500.00,
        transport_fee: 0,
        weekend_surcharge: 0,
        holiday_surcharge: 0,
      });

    mockFindCustomerByEmail.mockResolvedValue({ contact_id: 'Z_CUST_EXISTING' });
    mockCreateInvoice.mockResolvedValue({ invoice: { invoice_id: 'Z_INV_002' } });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.zoho_customer_id).toBe('Z_CUST_EXISTING');
    expect(json.customer_created).toBe(false);
    expect(mockCreateCustomer).not.toHaveBeenCalled();
  });

  test('handles Zoho customer creation failure', async () => {
    mockDb.first
      .mockResolvedValueOnce({
        id: 'SS-2026-1234',
        client_name: 'Jane Client',
        client_email: 'jane@example.com',
        client_phone: '+27123456789',
        property_address: '123 Main St',
        service_type: 'turnover_clean',
        status: 'scheduled',
      })
      .mockResolvedValueOnce({
        base_price: 500.00,
        transport_fee: 0,
        weekend_surcharge: 0,
        holiday_surcharge: 0,
      });

    mockFindCustomerByEmail.mockResolvedValue(null);
    mockCreateCustomer.mockResolvedValue({ code: 1001, message: 'Invalid email' });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe('Failed to create Zoho customer');
  });

  test('handles Zoho invoice creation failure', async () => {
    mockDb.first
      .mockResolvedValueOnce({
        id: 'SS-2026-1234',
        client_name: 'Jane Client',
        client_email: 'jane@example.com',
        client_phone: '+27123456789',
        property_address: '123 Main St',
        service_type: 'turnover_clean',
        status: 'scheduled',
      })
      .mockResolvedValueOnce({
        base_price: 500.00,
        transport_fee: 0,
        weekend_surcharge: 0,
        holiday_surcharge: 0,
      });

    mockFindCustomerByEmail.mockResolvedValue({ contact_id: 'Z_CUST_001' });
    mockCreateInvoice.mockResolvedValue({ code: 1002, message: 'Invalid line item' });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe('Failed to create Zoho invoice');
  });
});
