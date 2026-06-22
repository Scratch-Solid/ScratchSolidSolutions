import { getCloudflareContext } from '@/lib/runtime-context';

let accessToken = '';
let tokenExpiry = 0;
let apiDomain = ''; // captured from the token response (e.g. https://www.zohoapis.com)

async function getZohoCredentials() {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  // Data-center suffix: 'com' (US, default), 'eu', 'in', 'com.au', 'jp', 'sa', 'ca'.
  // Set ZOHO_DC to match the region your Zoho account/credentials belong to. Using the
  // wrong region is the most common cause of "credentials don't work" (token refresh 401).
  const dc = ((env as any)?.ZOHO_DC || process.env.ZOHO_DC || 'com').replace(/^\./, '');
  return {
    orgId: (env as any)?.ZOHO_ORG_ID || process.env.ZOHO_ORG_ID || '',
    clientId: (env as any)?.ZOHO_CLIENT_ID || process.env.ZOHO_CLIENT_ID || '',
    clientSecret: (env as any)?.ZOHO_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: (env as any)?.ZOHO_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN || '',
    dc,
  };
}

// Resolve the Zoho Books API base. Prefer the api_domain returned by the token endpoint
// (authoritative for the account's region); fall back to the configured data center.
function booksBase(dc: string): string {
  const domain = apiDomain || `https://www.zohoapis.${dc}`;
  return `${domain}/books/v3`;
}

async function getZohoToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const creds = await getZohoCredentials();
  const response = await fetch(`https://accounts.zoho.${creds.dc}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: creds.refreshToken, client_id: creds.clientId, client_secret: creds.clientSecret, grant_type: 'refresh_token' }),
  });
  const json = await response.json() as { access_token?: string; expires_in?: number; api_domain?: string; error?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(`Zoho token refresh failed (dc=${creds.dc}): ${json.error || response.status}`);
  }
  accessToken = json.access_token;
  if (json.api_domain) apiDomain = json.api_domain;
  tokenExpiry = Date.now() + ((json.expires_in || 3600) * 1000) - 60000;
  return accessToken;
}

async function zohoRequest(endpoint: string, method: string, body?: any) {
  const token = await getZohoToken();
  const creds = await getZohoCredentials();
  const options: RequestInit = { method, headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json', 'X-com-zoho-books-organizationid': creds.orgId } };
  if (body) options.body = JSON.stringify(body);
  return fetch(`${booksBase(creds.dc)}${endpoint}`, options);
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
  transportFee?: number;
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

  const lineItems: Array<Record<string, unknown>> = [
    { name: params.serviceName, rate: params.baselinePrice, quantity: 1 },
  ];
  // Include transport as its own line so the estimate subtotal matches the quote the
  // customer saw on screen (base + transport).
  if (params.transportFee && params.transportFee > 0) {
    lineItems.push({ name: 'Transport / Call-out fee', rate: params.transportFee, quantity: 1 });
  }

  const subtotal = params.baselinePrice + (params.transportFee || 0);

  const body: Record<string, unknown> = {
    customer_id: params.contactId,
    date: fmt(today),
    expiry_date: fmt(expiry),
    reference_number: params.refNumber,
    line_items: lineItems,
    notes: params.promoCode ? `Promo code applied: ${params.promoCode}` : '',
  };

  // Apply the discount at entity level as a percentage of the subtotal so the estimate
  // total equals finalPrice (the amount shown to the customer).
  if (params.discountAmount > 0 && subtotal > 0) {
    const pct = (params.discountAmount / subtotal) * 100;
    body.discount = `${pct.toFixed(2)}%`;
    body.discount_type = 'entity_level';
    body.is_discount_before_tax = true;
  }

  const response = await zohoRequest('/estimates', 'POST', body);
  return response.json() as Promise<{ estimate?: { estimate_id: string; estimate_number: string } }>;
}

export async function markEstimateAccepted(estimateId: string) {
  const response = await zohoRequest(`/estimates/${estimateId}/status/accepted`, 'POST', {});
  return response.json() as Promise<{ code: number; message: string }>;
}

export async function getEstimate(estimateId: string) {
  const response = await zohoRequest(`/estimates/${estimateId}`, 'GET');
  return response.json() as Promise<{ estimate?: { customer_id: string; reference_number?: string; line_items?: any[] } }>;
}

// Convert an existing estimate into an invoice. The previous code passed the estimate_id
// where a customer_id was expected, producing invalid invoices. We now look up the
// estimate to get its real customer_id and line items before creating the invoice.
export async function createInvoiceFromEstimate(estimateId: string, fallbackLineItems?: any[]) {
  const data = await getEstimate(estimateId);
  const customerId = data.estimate?.customer_id;
  if (!customerId) {
    throw new Error('Estimate has no customer_id; cannot create invoice');
  }
  const lineItems = (data.estimate?.line_items && data.estimate.line_items.length > 0)
    ? data.estimate.line_items.map((li: any) => ({ name: li.name, rate: li.rate, quantity: li.quantity || 1 }))
    : (fallbackLineItems || []);
  const body: Record<string, unknown> = {
    customer_id: customerId,
    reference_number: data.estimate?.reference_number || '',
    line_items: lineItems,
  };
  const response = await zohoRequest('/invoices', 'POST', body);
  return response.json() as Promise<{ invoice?: { invoice_id: string; invoice_number: string } }>;
}

export async function getEstimatePdf(estimateId: string): Promise<Response> {
  const token = await getZohoToken();
  const creds = await getZohoCredentials();
  return fetch(`${booksBase(creds.dc)}/estimates/${estimateId}?accept=pdf`, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'X-com-zoho-books-organizationid': creds.orgId,
    },
  });
}

export async function getCustomerStatementPdf(contactId: string): Promise<Response> {
  const token = await getZohoToken();
  const creds = await getZohoCredentials();
  return fetch(`${booksBase(creds.dc)}/contacts/${contactId}/statements?accept=pdf`, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'X-com-zoho-books-organizationid': creds.orgId,
    },
  });
}

export async function getCustomerStatement(contactId: string, startDate?: string, endDate?: string) {
  const token = await getZohoToken();
  const creds = await getZohoCredentials();
  let url = `${booksBase(creds.dc)}/contacts/${contactId}/statements`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += `?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'X-com-zoho-books-organizationid': creds.orgId,
    },
  });
  return response.json();
}

export async function getInvoicePdf(invoiceId: string): Promise<Response> {
  const token = await getZohoToken();
  const creds = await getZohoCredentials();
  return fetch(`${booksBase(creds.dc)}/invoices/${invoiceId}?accept=pdf`, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'X-com-zoho-books-organizationid': creds.orgId,
    },
  });
}
