import { log } from '@/lib/logger';
import { notifyAdminApproved, notifyAdminRejected, notifyConsentSubmitted, notifyContractSigned, sendCleanerWelcome } from '@/lib/notifications';
import { getEnvVarOptional } from '@/lib/env';

async function erpNextRequest(path: string, options: RequestInit = {}): Promise<any> {
  const baseUrl = getEnvVarOptional('ERPNEXT_BASE_URL') || getEnvVarOptional('ERPNEXT_API_URL');
  const apiKey = getEnvVarOptional('ERPNEXT_API_KEY');
  const apiSecret = getEnvVarOptional('ERPNEXT_API_SECRET');

  if (!baseUrl || !apiKey || !apiSecret) {
    throw new Error('ERPNext credentials not configured');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api${path}`;
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Basic ${btoa(`${apiKey}:${apiSecret}`)}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`ERPNext API error (${response.status}): ${text}`);
  }

  return response.json().catch(() => null);
}

export type CleanerIntegrationResult = {
  provider: 'internal' | 'erpnext' | 'docusign' | 'notifications';
  status: 'configured' | 'skipped' | 'pending' | 'sent';
  reference?: string;
  reason?: string;
};

function buildReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function hasErpNextConfig() {
  return Boolean(getEnvVarOptional('ERPNEXT_API_URL') && getEnvVarOptional('ERPNEXT_API_KEY') && getEnvVarOptional('ERPNEXT_API_SECRET'));
}

function hasDocusignConfig() {
  return Boolean(getEnvVarOptional('DOCUSIGN_INTEGRATION_KEY') && getEnvVarOptional('DOCUSIGN_ACCOUNT_ID'));
}

export async function createOnboardingSignatureReference(traceId: string, step: 'consent' | 'contract') {
  const configured = hasDocusignConfig();
  const prefix = step === 'consent' ? 'CONSENT' : 'CONTRACT';
  const reference = configured ? buildReference(`DOCUSIGN_${prefix}`) : buildReference(prefix);

  log.audit('ONBOARDING_SIGNATURE_REFERENCE_CREATED', 'cleaner_onboarding', {
    traceId,
    provider: configured ? 'docusign' : 'internal',
    step,
    reference,
  });

  return {
    signatureId: reference,
    integration: {
      provider: configured ? 'docusign' : 'internal',
      status: configured ? 'configured' : 'pending',
      reference,
      reason: configured ? undefined : 'DocuSign credentials not configured',
    } satisfies CleanerIntegrationResult,
  };
}

export async function createSignupSignatureReference(traceId: string) {
  const configured = hasDocusignConfig();
  const reference = configured ? buildReference('DOCUSIGN') : buildReference('SIGNUP');

  log.audit('SIGNATURE_REFERENCE_CREATED', 'cleaner_application', {
    traceId,
    provider: configured ? 'docusign' : 'internal',
    reference,
  });

  return {
    signatureId: reference,
    integration: {
      provider: configured ? 'docusign' : 'internal',
      status: configured ? 'configured' : 'pending',
      reference,
      reason: configured ? undefined : 'DocuSign credentials not configured',
    } satisfies CleanerIntegrationResult,
  };
}

export async function registerCleanerInErpNext(params: {
  traceId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
}) {
  if (!hasErpNextConfig()) {
    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: 'ERPNext credentials not configured',
    } satisfies CleanerIntegrationResult;
  }

  try {
    const result = await erpNextRequest('/resource/Employee', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          employee_number: params.employeeId,
          first_name: params.firstName,
          last_name: params.lastName,
          email: params.email,
          cell_number: params.phone,
          department: params.department,
          designation: params.position,
          status: 'Active',
          date_of_joining: new Date().toISOString().split('T')[0],
        },
      }),
    });

    log.audit('ERP_EMPLOYEE_CREATED', 'cleaner_application', {
      traceId: params.traceId,
      employeeId: params.employeeId,
      erpnextName: result?.data?.name,
    });

    return {
      provider: 'erpnext',
      status: 'configured',
      reference: result?.data?.name || params.employeeId,
    } satisfies CleanerIntegrationResult;
  } catch (error) {
    log.error('ERP_EMPLOYEE_CREATE_FAILED', error instanceof Error ? error : new Error(String(error)), {
      traceId: params.traceId,
      employeeId: params.employeeId,
    });

    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: error instanceof Error ? error.message : 'ERPNext employee creation failed',
    } satisfies CleanerIntegrationResult;
  }
}

export async function setupCleanerPayrollInErpNext(params: {
  traceId: string;
  employeeId: string;
  paysheetCode: string;
  bankDetailsPresent: boolean;
}) {
  if (!hasErpNextConfig()) {
    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: 'ERPNext payroll credentials not configured',
    } satisfies CleanerIntegrationResult;
  }

  if (!params.bankDetailsPresent) {
    return {
      provider: 'erpnext',
      status: 'skipped',
      reference: params.paysheetCode,
      reason: 'Bank details missing for payroll setup',
    } satisfies CleanerIntegrationResult;
  }

  try {
    // Create a minimal Salary Structure Assignment for the employee
    const result = await erpNextRequest('/resource/Salary Structure Assignment', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          employee: params.employeeId,
          from_date: new Date().toISOString().split('T')[0],
          base: 0, // Will be updated by admin
        },
      }),
    });

    log.audit('ERP_PAYROLL_SETUP', 'cleaner_application', {
      traceId: params.traceId,
      employeeId: params.employeeId,
      assignmentName: result?.data?.name,
    });

    return {
      provider: 'erpnext',
      status: 'configured',
      reference: result?.data?.name || params.paysheetCode,
    } satisfies CleanerIntegrationResult;
  } catch (error) {
    log.error('ERP_PAYROLL_SETUP_FAILED', error instanceof Error ? error : new Error(String(error)), {
      traceId: params.traceId,
      employeeId: params.employeeId,
    });

    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.paysheetCode,
      reason: error instanceof Error ? error.message : 'ERPNext payroll setup failed',
    } satisfies CleanerIntegrationResult;
  }
}

export async function notifyCleanerApproval(params: {
  traceId: string;
  phone: string;
  email: string;
  name: string;
  paysheetCode: string;
  tempPassword: string;
}) {
  const result = await sendCleanerWelcome(params.phone, params.email, params.name, params.paysheetCode, params.tempPassword);
  log.audit('APPROVAL_NOTIFICATION', 'cleaner_application', {
    traceId: params.traceId,
    phone: params.phone,
    email: params.email,
    paysheetCode: params.paysheetCode,
    whatsappSuccess: result.whatsapp.success,
    whatsappSkipped: result.whatsapp.skipped,
    emailSuccess: result.email.success,
    emailSkipped: result.email.skipped,
  });

  return {
    provider: 'notifications',
    status: (result.whatsapp.success || result.email.success) ? 'sent' : (result.whatsapp.skipped && result.email.skipped) ? 'skipped' : 'pending',
    reference: params.paysheetCode,
    reason: result.whatsapp.error || result.email.error || result.whatsapp.skipReason || result.email.skipReason,
  } satisfies CleanerIntegrationResult;
}

export async function notifyCleanerRejection(params: {
  traceId: string;
  phone: string;
  name: string;
  reason?: string;
}) {
  const result = await notifyAdminRejected(params.phone, params.name, params.reason);
  log.audit('REJECTION_NOTIFICATION', 'cleaner_application', {
    traceId: params.traceId,
    phone: params.phone,
    success: result.success,
    skipped: result.skipped,
  });

  return {
    provider: 'notifications',
    status: result.success ? 'sent' : result.skipped ? 'skipped' : 'pending',
    reference: params.phone,
    reason: result.error || result.skipReason,
  } satisfies CleanerIntegrationResult;
}

export async function notifyCleanerConsent(params: {
  traceId: string;
  phone: string;
  name: string;
}) {
  const result = await notifyConsentSubmitted(params.phone, params.name);
  log.audit('CONSENT_NOTIFICATION', 'cleaner_onboarding', {
    traceId: params.traceId,
    phone: params.phone,
    success: result.success,
    skipped: result.skipped,
  });

  return {
    provider: 'notifications',
    status: result.success ? 'sent' : result.skipped ? 'skipped' : 'pending',
    reference: params.phone,
    reason: result.error || result.skipReason,
  } satisfies CleanerIntegrationResult;
}

export async function notifyCleanerContract(params: {
  traceId: string;
  phone: string;
  name: string;
}) {
  const result = await notifyContractSigned(params.phone, params.name);
  log.audit('CONTRACT_NOTIFICATION', 'cleaner_onboarding', {
    traceId: params.traceId,
    phone: params.phone,
    success: result.success,
    skipped: result.skipped,
  });

  return {
    provider: 'notifications',
    status: result.success ? 'sent' : result.skipped ? 'skipped' : 'pending',
    reference: params.phone,
    reason: result.error || result.skipReason,
  } satisfies CleanerIntegrationResult;
}
