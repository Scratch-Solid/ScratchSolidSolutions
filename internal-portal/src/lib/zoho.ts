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
  const json = await response.json();
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
  const json = await response.json();
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
