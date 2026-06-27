import { getCloudflareContext } from './runtime-context';

export async function getZohoCreds() {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  const dc = ((env as any)?.ZOHO_DC || process.env.ZOHO_DC || 'com').replace(/^\./, '');
  return {
    orgId: (env as any)?.ZOHO_ORG_ID || process.env.ZOHO_ORG_ID || '',
    clientId: (env as any)?.ZOHO_CLIENT_ID || process.env.ZOHO_CLIENT_ID || '',
    clientSecret: (env as any)?.ZOHO_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: (env as any)?.ZOHO_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN || '',
    dc,
  };
}

export function accountsBase(dc: string): string {
  return `https://accounts.zoho.${dc}`;
}

export function booksBase(dc: string): string {
  return `https://books.zoho.${dc}/api/v3`;
}

let accessToken = '';
let tokenExpiry = 0;

export async function getZohoToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const creds = await getZohoCreds();
  if (!creds.refreshToken || !creds.clientId || !creds.clientSecret) {
    throw new Error('Zoho credentials not configured');
  }
  const response = await fetch(`${accountsBase(creds.dc)}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: creds.refreshToken, client_id: creds.clientId, client_secret: creds.clientSecret, grant_type: 'refresh_token' }),
  });
  const json = await response.json() as any;
  accessToken = json.access_token;
  tokenExpiry = Date.now() + (json.expires_in * 1000) - 60000;
  return accessToken;
}

export async function zohoRequest(endpoint: string, method: string, body?: any) {
  const token = await getZohoToken();
  const creds = await getZohoCreds();
  const options: RequestInit = { method, headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json', 'X-com-zoho-books-organizationid': creds.orgId } };
  if (body) options.body = JSON.stringify(body);
  return fetch(`${booksBase(creds.dc)}${endpoint}`, options);
}

export async function findCustomerByEmail(email: string) {
  const response = await zohoRequest(`/contacts?email=${encodeURIComponent(email)}`, 'GET');
  const json = await response.json() as any;
  const contacts = json.contacts || [];
  return contacts.find((c: any) => c.contact_type === 'customer' && c.email?.toLowerCase() === email.toLowerCase()) || null;
}

export async function createCustomer(name: string, email: string, phone: string, billingAddress?: string) {
  const body: any = {
    contact_name: name,
    contact_type: 'customer',
    email: email,
    phone: phone,
  };
  if (billingAddress) {
    body.billing_address = { address: billingAddress, city: '', state: '', zip: '', country: 'South Africa' };
  }
  const response = await zohoRequest('/contacts', 'POST', body);
  return response.json();
}

export async function createInvoice(customerId: string, lineItems: any[], options?: { reference?: string; notes?: string; date?: string }) {
  const body: any = { customer_id: customerId, line_items: lineItems };
  if (options?.reference) body.reference_number = options.reference;
  if (options?.notes) body.notes = options.notes;
  if (options?.date) body.date = options.date;
  const response = await zohoRequest('/invoices', 'POST', body);
  return response.json();
}

export async function recordPayment(invoiceId: string, amount: number, paymentMode: 'cash' | 'eft' | 'card', date: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}/payments`, 'POST', { amount, payment_mode: paymentMode, date });
  return response.json();
}

export async function verifyPOP(invoiceId: string, popReference: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}`, 'GET');
  const json = await response.json() as any;
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
