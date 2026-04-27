const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID || '';
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '';
let accessToken = '';
let tokenExpiry = 0;

async function getZohoToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: ZOHO_REFRESH_TOKEN, client_id: ZOHO_CLIENT_ID, client_secret: ZOHO_CLIENT_SECRET, grant_type: 'refresh_token' }),
  });
  const json = await response.json() as { access_token: string; expires_in: number };
  accessToken = json.access_token;
  tokenExpiry = Date.now() + (json.expires_in * 1000) - 60000;
  return accessToken;
}

async function zohoRequest(endpoint: string, method: string, body?: any) {
  const token = await getZohoToken();
  const options: RequestInit = { method, headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json', 'X-com-zoho-books-organizationid': ZOHO_ORG_ID } };
  if (body) options.body = JSON.stringify(body);
  return fetch(`https://books.zoho.com/api/v3${endpoint}`, options);
}

export async function createInvoice(customerId: string, lineItems: any[]) {
  const response = await zohoRequest('/invoices', 'POST', { customer_id: customerId, line_items: lineItems });
  return response.json();
}

export async function recordPayment(invoiceId: string, amount: number, paymentMode: 'cash' | 'eft' | 'card', date: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}/payments`, 'POST', { amount, payment_mode: paymentMode, date });
  return response.json();
}

export async function verifyPOP(invoiceId: string, popReference: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}`, 'GET');
  const json = await response.json() as { invoice?: { payments?: Array<{ description?: string }> } };
  const payments = json.invoice?.payments || [];
  const match = payments.find((p: any) => p.description?.includes(popReference));
  return { verified: !!match, payment: match || null };
}

export async function cancelOverdueInvoice(invoiceId: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}/status/sent`, 'POST', { reason: 'Payment overdue - automatic cancellation' });
  return response.json();
}

export async function createCreditNote(customerId: string, lineItems: any[], reference: string) {
  const response = await zohoRequest('/creditnotes', 'POST', { customer_id: customerId, line_items: lineItems, reference_number: reference });
  return response.json();
}

export async function applyCreditNoteToInvoice(creditNoteId: string, invoiceId: string, amount: number) {
  const response = await zohoRequest(`/creditnotes/${creditNoteId}/invoices`, 'POST', { invoice_id: invoiceId, amount_applied: amount });
  return response.json();
}

export async function getInvoiceStatus(invoiceId: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}`, 'GET');
  return response.json();
}

export async function findOrCreateContact(name: string, email: string, phone: string) {
  if (email) {
    const search = await zohoRequest(`/contacts?email=${encodeURIComponent(email)}`, 'GET');
    const searchJson = await search.json() as { contacts?: Array<{ contact_id: string }> };
    if (searchJson.contacts && searchJson.contacts.length > 0) {
      return searchJson.contacts[0].contact_id;
    }
  }
  const create = await zohoRequest('/contacts', 'POST', {
    contact_name: name,
    contact_type: 'customer',
    email,
    phone,
  });
  const createJson = await create.json() as { contact?: { contact_id: string } };
  return createJson.contact?.contact_id || null;
}

export async function createEstimate(params: {
  contactId: string;
  serviceName: string;
  baselinePrice: number;
  discountAmount: number;
  finalPrice: number;
  promoCode?: string;
  refNumber: string;
  expiryDays?: number;
}) {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setDate(expiry.getDate() + (params.expiryDays || 14));
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const body: Record<string, unknown> = {
    customer_id: params.contactId,
    date: fmt(today),
    expiry_date: fmt(expiry),
    reference_number: params.refNumber,
    line_items: [
      {
        name: params.serviceName,
        rate: params.baselinePrice,
        quantity: 1,
      },
    ],
    notes: params.promoCode ? `Promo code applied: ${params.promoCode}` : '',
  };

  if (params.discountAmount > 0) {
    body.discount = ((params.discountAmount / params.baselinePrice) * 100).toFixed(2);
    body.is_discount_before_tax = true;
  }

  const response = await zohoRequest('/estimates', 'POST', body);
  return response.json() as Promise<{ estimate?: { estimate_id: string; estimate_number: string } }>;
}

export async function markEstimateAccepted(estimateId: string) {
  const response = await zohoRequest(`/estimates/${estimateId}/status/accepted`, 'POST', {});
  return response.json() as Promise<{ code: number; message: string }>;
}

export async function getEstimatePdf(estimateId: string): Promise<Response> {
  const token = await getZohoToken();
  return fetch(`https://books.zoho.com/api/v3/estimates/${estimateId}?accept=pdf`, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'X-com-zoho-books-organizationid': ZOHO_ORG_ID,
    },
  });
}
