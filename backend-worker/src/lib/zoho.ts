/**
 * Zoho Books integration module for backend-worker
 * Provides functions for invoice, credit note, and payment operations
 * Supports data-center aware URLs (US, EU, IN, AU, etc.)
 */

// Legacy global reference for scheduled handlers
let envInstance: any = null;

/**
 * Set the global environment instance (legacy — for scheduled handlers only)
 * Prefer passing env directly to each function for HTTP route contexts.
 */
export function setEnvInstance(env: any) {
  envInstance = env;
}

function getDc(env: any): string {
  const dc = (env?.ZOHO_DC || 'com').replace(/^\./, '');
  return dc;
}

function accountsBase(dc: string): string {
  return `https://accounts.zoho.${dc}`;
}

function booksBase(dc: string): string {
  return `https://books.zoho.${dc}/api/v3`;
}

function resolveEnv(explicitEnv?: any): any {
  if (explicitEnv) return explicitEnv;
  if (envInstance) return envInstance;
  throw new Error('Zoho env not available. Pass env explicitly or call setEnvInstance(env) first.');
}

/**
 * Get Zoho access token with automatic refresh
 */
async function getZohoToken(explicitEnv?: any): Promise<string> {
  const env = resolveEnv(explicitEnv);
  const dc = getDc(env);

  const response = await fetch(`${accountsBase(dc)}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: env.ZOHO_REFRESH_TOKEN,
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Zoho token: ${response.statusText}`);
  }

  const json = await response.json() as { access_token: string; expires_in: number };
  return json.access_token;
}

/**
 * Make a request to Zoho Books API
 */
async function zohoRequest(endpoint: string, method: string, body: any | undefined, explicitEnv?: any) {
  const env = resolveEnv(explicitEnv);
  const dc = getDc(env);
  const token = await getZohoToken(env);
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      'X-com-zoho-books-organizationid': env.ZOHO_ORG_ID
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetch(`${booksBase(dc)}${endpoint}`, options);
}

/**
 * Cancel an overdue invoice
 */
export async function cancelOverdueInvoice(invoiceId: string, explicitEnv?: any) {
  const response = await zohoRequest(`/invoices/${invoiceId}/status/sent`, 'POST', {
    reason: 'Payment overdue - automatic cancellation'
  }, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to cancel invoice ${invoiceId}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a credit note for a customer
 */
export async function createCreditNote(customerId: string, lineItems: any[], reference: string, explicitEnv?: any) {
  const response = await zohoRequest('/creditnotes', 'POST', {
    customer_id: customerId,
    line_items: lineItems,
    reference_number: reference
  }, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to create credit note: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Apply a credit note to an invoice
 */
export async function applyCreditNoteToInvoice(creditNoteId: string, invoiceId: string, amount: number, explicitEnv?: any) {
  const response = await zohoRequest(`/creditnotes/${creditNoteId}/invoices`, 'POST', {
    invoice_id: invoiceId,
    amount_applied: amount
  }, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to apply credit note to invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Find a customer by email in Zoho Books
 */
export async function findCustomerByEmail(email: string, explicitEnv?: any) {
  const response = await zohoRequest(`/contacts?email=${encodeURIComponent(email)}`, 'GET', undefined, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to find customer: ${response.statusText}`);
  }
  const data = await response.json() as { contacts?: any[] };
  return data.contacts && data.contacts.length > 0 ? data.contacts[0] : null;
}

/**
 * Create a customer in Zoho Books
 */
export async function createCustomer(
  displayName: string,
  email: string,
  phone: string,
  billingAddress: string,
  explicitEnv?: any
) {
  const response = await zohoRequest('/contacts', 'POST', {
    contact_type: 'customer',
    contact_name: displayName,
    email,
    phone,
    billing_address: billingAddress ? {
      address: billingAddress,
    } : undefined,
  }, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to create customer: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create an invoice for a customer
 */
export async function createInvoice(customerId: string, lineItems: any[], explicitEnv?: any) {
  const response = await zohoRequest('/invoices', 'POST', {
    customer_id: customerId,
    line_items: lineItems
  }, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to create invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Record a payment for an invoice
 */
export async function recordPayment(invoiceId: string, amount: number, paymentMode: 'cash' | 'eft' | 'card', date: string, explicitEnv?: any) {
  const response = await zohoRequest(`/invoices/${invoiceId}/payments`, 'POST', {
    amount,
    payment_mode: paymentMode,
    date
  }, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to record payment: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get invoice status
 */
export async function getInvoiceStatus(invoiceId: string, explicitEnv?: any) {
  const response = await zohoRequest(`/invoices/${invoiceId}`, 'GET', undefined, explicitEnv);
  if (!response.ok) {
    throw new Error(`Failed to get invoice status: ${response.statusText}`);
  }
  return response.json();
}
