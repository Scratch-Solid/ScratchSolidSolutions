import { log } from '@/lib/logger';
import { notifyAdminApproved, notifyAdminRejected, notifyConsentSubmitted, notifyContractSigned, sendCleanerWelcome } from '@/lib/notifications';
import { createEnvelope, getSigningUrl, isDocusignFullyConfigured } from '@/lib/docusign';
import { getCloudflareContext } from '@/lib/runtime-context';

async function getErpNextCreds() {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  return {
    baseUrl: (env as any)?.ERPNEXT_BASE_URL || (env as any)?.ERPNEXT_API_URL || process.env.ERPNEXT_BASE_URL || process.env.ERPNEXT_API_URL || undefined,
    apiKey: (env as any)?.ERPNEXT_API_KEY || process.env.ERPNEXT_API_KEY || undefined,
    apiSecret: (env as any)?.ERPNEXT_API_SECRET || process.env.ERPNEXT_API_SECRET || undefined,
  };
}

async function erpNextRequest(path: string, options: RequestInit = {}): Promise<any> {
  const creds = await getErpNextCreds();
  const { baseUrl, apiKey, apiSecret } = creds;

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

async function hasErpNextConfig() {
  const creds = await getErpNextCreds();
  return Boolean(creds.baseUrl && creds.apiKey && creds.apiSecret);
}

function hasDocusignConfig() {
  return isDocusignFullyConfigured();
}

export async function createOnboardingSignatureReference(
  traceId: string,
  step: 'consent' | 'contract',
  params?: {
    cleanerEmail?: string;
    cleanerName?: string;
    returnUrl?: string;
  }
) {
  const configured = hasDocusignConfig();
  const prefix = step === 'consent' ? 'CONSENT' : 'CONTRACT';

  if (configured && step === 'contract' && params?.cleanerEmail && params?.cleanerName) {
    try {
      const contractHtml = buildEmploymentContractHtml(params.cleanerName);
      const envelope = await createEnvelope({
        subject: 'Scratch Solid Solutions — Employment Contract',
        emailBlurb: `Hi ${params.cleanerName},\n\nPlease review and sign your employment contract with Scratch Solid Solutions.\n\nBest regards,\nThe Scratch Solid Solutions Team`,
        documentName: 'Employment Contract',
        documentBase64: btoa(contractHtml),
        recipients: [
          {
            email: params.cleanerEmail,
            name: params.cleanerName,
            recipientId: '1',
            routingOrder: '1',
          },
        ],
      });

      const signingUrl = await getSigningUrl({
        envelopeId: envelope.envelopeId,
        recipientEmail: params.cleanerEmail,
        recipientName: params.cleanerName,
        returnUrl: params.returnUrl || 'https://portal.scratchsolidsolutions.org/onboarding/contract-complete',
      });

      log.audit('DOCUSIGN_CONTRACT_ENVELOPE_CREATED', 'cleaner_onboarding', {
        traceId,
        envelopeId: envelope.envelopeId,
        cleanerEmail: params.cleanerEmail,
        step,
      });

      return {
        signatureId: envelope.envelopeId,
        signingUrl,
        integration: {
          provider: 'docusign',
          status: 'sent',
          reference: envelope.envelopeId,
        } satisfies CleanerIntegrationResult,
      };
    } catch (error) {
      log.error('DOCUSIGN_CONTRACT_ENVELOPE_FAILED', error instanceof Error ? error : new Error(String(error)), {
        traceId,
        cleanerEmail: params.cleanerEmail,
        step,
      });

      // Fallback to internal reference on DocuSign failure
      const reference = buildReference(prefix);
      return {
        signatureId: reference,
        signingUrl: undefined,
        integration: {
          provider: 'internal',
          status: 'pending',
          reference,
          reason: error instanceof Error ? error.message : 'DocuSign envelope creation failed',
        } satisfies CleanerIntegrationResult,
      };
    }
  }

  const reference = configured ? buildReference(`DOCUSIGN_${prefix}`) : buildReference(prefix);

  log.audit('ONBOARDING_SIGNATURE_REFERENCE_CREATED', 'cleaner_onboarding', {
    traceId,
    provider: configured ? 'docusign' : 'internal',
    step,
    reference,
  });

  return {
    signatureId: reference,
    signingUrl: undefined,
    integration: {
      provider: configured ? 'docusign' : 'internal',
      status: configured ? 'configured' : 'pending',
      reference,
      reason: configured ? undefined : 'DocuSign credentials not configured',
    } satisfies CleanerIntegrationResult,
  };
}

function buildEmploymentContractHtml(cleanerName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Employment Contract</title>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
h1 { text-align: center; }
.section { margin-bottom: 20px; }
.signature-block { margin-top: 40px; }
</style>
</head>
<body>
<h1>Employment Contract</h1>
<div class="section">
<p><strong>Between:</strong> Scratch Solid Solutions (Pty) Ltd<br>
<strong>And:</strong> ${cleanerName}</p>
</div>
<div class="section">
<h2>1. Position</h2>
<p>The Employee is engaged as a Cleaning Services Professional.</p>
</div>
<div class="section">
<h2>2. Term</h2>
<p>This contract is effective from the date of signature and continues until terminated in accordance with clause 5.</p>
</div>
<div class="section">
<h2>3. Duties</h2>
<p>The Employee shall perform cleaning services at client premises as assigned by the Employer.</p>
</div>
<div class="section">
<h2>4. Remuneration</h2>
<p>The Employee shall be paid in accordance with the paysheet code assigned upon approval.</p>
</div>
<div class="section">
<h2>5. Termination</h2>
<p>Either party may terminate this contract with 30 days written notice.</p>
</div>
<div class="signature-block">
<p><strong>Employer Signature:</strong> ##SIGN_HERE##</p>
<p><strong>Date:</strong> ##DATE_SIGNED##</p>
<p><strong>Employee Signature:</strong> ##SIGN_HERE##</p>
<p><strong>Date:</strong> ##DATE_SIGNED##</p>
</div>
</body>
</html>`;
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
  if (!(await hasErpNextConfig())) {
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

export async function createShiftAssignmentInErpNext(params: {
  traceId: string;
  employeeId: string;
  shiftType: string;
  startDate: string;
  endDate?: string;
  jobReference?: string;
}) {
  if (!(await hasErpNextConfig())) {
    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: 'ERPNext credentials not configured',
    } satisfies CleanerIntegrationResult;
  }

  try {
    const result = await erpNextRequest('/resource/Shift Assignment', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          employee: params.employeeId,
          shift_type: params.shiftType,
          start_date: params.startDate,
          end_date: params.endDate || params.startDate,
          status: 'Active',
          custom_job_reference: params.jobReference || '',
        },
      }),
    });

    log.audit('ERP_SHIFT_CREATED', 'workforce_dispatch', {
      traceId: params.traceId,
      employeeId: params.employeeId,
      shiftName: result?.data?.name,
      jobReference: params.jobReference,
    });

    return {
      provider: 'erpnext',
      status: 'configured',
      reference: result?.data?.name || params.employeeId,
    } satisfies CleanerIntegrationResult;
  } catch (error) {
    log.error('ERP_SHIFT_CREATE_FAILED', error instanceof Error ? error : new Error(String(error)), {
      traceId: params.traceId,
      employeeId: params.employeeId,
    });

    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: error instanceof Error ? error.message : 'ERPNext shift creation failed',
    } satisfies CleanerIntegrationResult;
  }
}

export async function setupCleanerPayrollInErpNext(params: {
  traceId: string;
  employeeId: string;
  paysheetCode: string;
  bankDetailsPresent: boolean;
}) {
  if (!(await hasErpNextConfig())) {
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
