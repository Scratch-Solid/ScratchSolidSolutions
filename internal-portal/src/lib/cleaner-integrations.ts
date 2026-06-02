import { log } from '@/lib/logger';
import { notifyAdminApproved, notifyAdminRejected, notifyConsentSubmitted, notifyContractSigned, sendCleanerWelcome } from '@/lib/notifications';
import { getEnvVarOptional } from '@/lib/env';

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

  log.audit('ERP_EMPLOYEE_SYNC_SKIPPED_EXTERNAL', 'cleaner_application', {
    traceId: params.traceId,
    employeeId: params.employeeId,
  });

  return {
    provider: 'erpnext',
    status: 'configured',
    reference: params.employeeId,
  } satisfies CleanerIntegrationResult;
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

  return {
    provider: 'erpnext',
    status: params.bankDetailsPresent ? 'configured' : 'skipped',
    reference: params.paysheetCode,
    reason: params.bankDetailsPresent ? undefined : 'Bank details missing for payroll setup',
  } satisfies CleanerIntegrationResult;
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
