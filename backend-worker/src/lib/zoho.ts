/**
 * Zoho Books integration module for backend-worker
 * Provides functions for invoice, credit note, and payment operations
 */

// Global reference to the environment instance
let envInstance: any = null;

/**
 * Set the global environment instance
 * Call this from the scheduled handler before using Zoho functions
 */
export function setEnvInstance(env: any) {
  envInstance = env;
}

/**
 * Get Zoho access token with automatic refresh
 */
async function getZohoToken(): Promise<string> {
  if (!envInstance) {
    throw new Error('Environment instance not set. Call setEnvInstance(env) from the scheduled handler first.');
  }

  // In a real implementation, you would cache the token and refresh when expired
  // For now, we'll fetch a new token each time (inefficient but functional)
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: envInstance.ZOHO_REFRESH_TOKEN,
      client_id: envInstance.ZOHO_CLIENT_ID,
      client_secret: envInstance.ZOHO_CLIENT_SECRET,
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
async function zohoRequest(endpoint: string, method: string, body?: any) {
  const token = await getZohoToken();
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      'X-com-zoho-books-organizationid': envInstance.ZOHO_ORG_ID
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetch(`https://books.zoho.com/api/v3${endpoint}`, options);
}

/**
 * Cancel an overdue invoice
 */
export async function cancelOverdueInvoice(invoiceId: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}/status/sent`, 'POST', {
    reason: 'Payment overdue - automatic cancellation'
  });
  if (!response.ok) {
    throw new Error(`Failed to cancel invoice ${invoiceId}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a credit note for a customer
 */
export async function createCreditNote(customerId: string, lineItems: any[], reference: string) {
  const response = await zohoRequest('/creditnotes', 'POST', {
    customer_id: customerId,
    line_items: lineItems,
    reference_number: reference
  });
  if (!response.ok) {
    throw new Error(`Failed to create credit note: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Apply a credit note to an invoice
 */
export async function applyCreditNoteToInvoice(creditNoteId: string, invoiceId: string, amount: number) {
  const response = await zohoRequest(`/creditnotes/${creditNoteId}/invoices`, 'POST', {
    invoice_id: invoiceId,
    amount_applied: amount
  });
  if (!response.ok) {
    throw new Error(`Failed to apply credit note to invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create an invoice for a customer
 */
export async function createInvoice(customerId: string, lineItems: any[]) {
  const response = await zohoRequest('/invoices', 'POST', {
    customer_id: customerId,
    line_items: lineItems
  });
  if (!response.ok) {
    throw new Error(`Failed to create invoice: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Record a payment for an invoice
 */
export async function recordPayment(invoiceId: string, amount: number, paymentMode: 'cash' | 'eft' | 'card', date: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}/payments`, 'POST', {
    amount,
    payment_mode: paymentMode,
    date
  });
  if (!response.ok) {
    throw new Error(`Failed to record payment: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get invoice status
 */
export async function getInvoiceStatus(invoiceId: string) {
  const response = await zohoRequest(`/invoices/${invoiceId}`, 'GET');
  if (!response.ok) {
    throw new Error(`Failed to get invoice status: ${response.statusText}`);
  }
  return response.json();
}
