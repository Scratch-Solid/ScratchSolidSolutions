import { getEnvVarOptional } from './env';
import {
  sendWhatsAppMessage,
  isConversationWindowOpen,
} from './whatsapp/meta-cloud';

const RESEND_API_KEY = getEnvVarOptional('RESEND_API_KEY') || '';
const EMAIL_FROM = getEnvVarOptional('EMAIL_FROM') || 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>';

export interface NotificationResult {
  success: boolean;
  error?: string;
  messageId?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface NotificationPreferences {
  whatsapp: boolean;
  email: boolean;
}

// Simple template-to-text mapping for free-form messages (no paid templates)
function buildFreeformMessage(templateName: string, params: Record<string, string>): string {
  const mappings: Record<string, (p: Record<string, string>) => string> = {
    status_update: (p) => `Status Update: ${p.status}${p.booking_id ? ` for booking ${p.booking_id}` : ''}.`,
    payment_reminder: (p) => `Payment Reminder: Amount ${p.amount} due by ${p.due_date}.`,
    consent_submitted: (p) => `Hi ${p.name}, your background check consent has been submitted successfully.`,
    admin_approved: (p) => `Hi ${p.name}, your application has been approved! Welcome to the team.`,
    admin_rejected: (p) => `Hi ${p.name}, unfortunately your application was not approved. Reason: ${p.reason || 'Not specified'}.`,
    cleaner_welcome: (p) => `Welcome ${p.name}! Your paysheet code: ${p.paysheet_code}. Portal: ${p.portal_url || 'https://portal.scratchsolidsolutions.org'}`,
    profile_created: (p) => `Hi ${p.name}, your profile has been created successfully.`,
    contract_signed: (p) => `Hi ${p.name}, your contract has been signed and recorded.`,
    training_completed: (p) => `Congratulations ${p.name}! Training completed. Certificate: ${p.cert_hash}.`,
  };
  const builder = mappings[templateName];
  return builder ? builder(params) : `${templateName}: ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ')}`;
}

/**
 * Send a WhatsApp message enforcing free-tier policy:
 * - Only sends free-form messages within the 24h conversation window
 * - Outside the window, returns failure so callers fall back to Resend email
 */
export async function sendWhatsApp(
  to: string,
  templateName: string,
  params: Record<string, string>,
  preferences?: NotificationPreferences,
  db?: any
): Promise<NotificationResult> {
  if (preferences && !preferences.whatsapp) {
    return { success: false, skipped: true, skipReason: 'WhatsApp notifications disabled' };
  }

  // Free-tier enforcement: check conversation window before sending
  if (db) {
    const windowOpen = await isConversationWindowOpen(db, to);
    if (!windowOpen) {
      return {
        success: false,
        error: 'WhatsApp conversation window closed (free-tier enforced)',
      };
    }
  }

  const body = buildFreeformMessage(templateName, params);
  const result = await sendWhatsAppMessage(to, body);
  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

export async function sendEmail(to: string, subject: string, body: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  if (preferences && !preferences.email) {
    return { success: false, skipped: true, skipReason: 'Email notifications disabled' };
  }
  if (!RESEND_API_KEY) return { success: false, error: 'Email not configured' };
  try {
    const hasHtml = /<[a-z][\s\S]*>/i.test(body);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html: hasHtml ? body : undefined,
        text: hasHtml ? body.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim() : body,
      }),
    });
    const data = await response.json() as { id?: string };
    return { success: response.ok, messageId: data.id };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: String(error) };
  }
}

export async function notifyCleanerStatusChange(cleanerPhone: string, status: string, bookingId: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  const wa = await sendWhatsApp(cleanerPhone, 'status_update', { status, booking_id: bookingId }, preferences, db);
  if (!wa.success && !wa.skipped) await sendEmail(cleanerPhone + '@fallback.com', 'Status Update', `Status changed to ${status} for booking ${bookingId}`, preferences);
  return wa;
}

export async function notifyPaymentReminder(clientPhone: string, clientEmail: string, amount: string, dueDate: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  const wa = await sendWhatsApp(clientPhone, 'payment_reminder', { amount, due_date: dueDate }, preferences, db);
  if (!wa.success && !wa.skipped) await sendEmail(clientEmail, 'Payment Reminder', `Payment of ${amount} due by ${dueDate}`, preferences);
  return wa;
}

export async function notifyAdminFailure(adminEmail: string, action: string, error: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendEmail(adminEmail, 'Admin Action Failure', `Action "${action}" failed with error: ${error}`, preferences);
}

// Onboarding notification functions
export async function notifyConsentSubmitted(phone: string, name: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'consent_submitted', { name }, preferences, db);
}

export async function notifyAdminApproved(phone: string, name: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'admin_approved', { name }, preferences, db);
}

export async function sendCleanerWelcome(phone: string, email: string, name: string, paysheetCode: string, tempPassword: string, preferences?: NotificationPreferences, db?: any): Promise<{ whatsapp: NotificationResult; email: NotificationResult }> {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

  // WhatsApp: concise welcome with key credentials
  const waParams = {
    name,
    paysheet_code: paysheetCode,
    temp_password: tempPassword,
    portal_url: portalUrl,
  };
  const waResult = await sendWhatsApp(phone, 'cleaner_welcome', waParams, preferences, db);

  // Email: comprehensive welcome with full instructions
  const emailSubject = 'Welcome to Scratch Solid Solutions - Your Account is Ready!';
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to Scratch Solid Solutions</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af;">Welcome to the Team, ${name}!</h1>
    <p style="font-size: 18px;">Your application has been approved and your account is ready.</p>
  </div>

  <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px;">
    <h2 style="margin-top: 0; color: #1e40af;">Your Login Credentials</h2>
    <p><strong>Portal URL:</strong> <a href="${portalUrl}/auth/login" style="color: #2563eb;">${portalUrl}/auth/login</a></p>
    <p><strong>Username (Paysheet Code):</strong> <code style="background: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${paysheetCode}</code></p>
    <p><strong>Temporary Password:</strong> <code style="background: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
    <p style="color: #dc2626; font-weight: bold;">Important: You will be required to change this password on your first login.</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="color: #1e40af;">How to Log In</h2>
    <ol>
      <li>Go to <a href="${portalUrl}/auth/login" style="color: #2563eb;">${portalUrl}/auth/login</a></li>
      <li>Enter your <strong>Username (Paysheet Code)</strong>: <code>${paysheetCode}</code></li>
      <li>Enter your <strong>Temporary Password</strong>: <code>${tempPassword}</code></li>
      <li>Click <strong>Login</strong></li>
      <li>You will be prompted to create a new secure password</li>
    </ol>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="color: #1e40af;">Next Steps - Complete Your Onboarding</h2>
    <p>Before you can be assigned cleaning jobs, you must complete the following steps:</p>
    <ol>
      <li><strong>Background Check Consent:</strong> Review and agree to the background check consent form.</li>
      <li><strong>Contract Signing:</strong> Read and digitally sign your employment contract.</li>
      <li><strong>Training Modules:</strong> Complete all required training modules to ensure quality service.</li>
    </ol>
    <p style="background: #fef3c7; padding: 15px; border-radius: 8px;"><strong>Note:</strong> You will only be able to view job assignments and access the full cleaner dashboard once all onboarding steps are completed.</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="color: #1e40af;">What You Can Use the Portal For</h2>
    <ul>
      <li>Update your personal and banking details</li>
      <li>View your assigned cleaning jobs and schedule</li>
      <li>Update your job status (On the way, Arrived, Completed)</li>
      <li>View your KPI scores and performance metrics</li>
      <li>Access and download your salary slips</li>
      <li>Check your 13th cheque eligibility status</li>
      <li>Communicate with admin and support</li>
    </ul>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 14px;">If you have any questions or need assistance, please contact admin support.</p>
    <p style="color: #6b7280; font-size: 14px;">Welcome aboard!</p>
  </div>
</body>
</html>
`;
  const emailText = `Welcome to Scratch Solid Solutions, ${name}!

Your application has been approved and your account is ready.

YOUR LOGIN CREDENTIALS
Portal URL: ${portalUrl}/auth/login
Username (Paysheet Code): ${paysheetCode}
Temporary Password: ${tempPassword}

IMPORTANT: You will be required to change this password on your first login.

HOW TO LOG IN
1. Go to ${portalUrl}/auth/login
2. Enter your Username (Paysheet Code): ${paysheetCode}
3. Enter your Temporary Password: ${tempPassword}
4. Click Login
5. You will be prompted to create a new secure password

NEXT STEPS - COMPLETE YOUR ONBOARDING
Before you can be assigned cleaning jobs, you must complete:
1. Background Check Consent - Review and agree to the consent form
2. Contract Signing - Read and digitally sign your employment contract
3. Training Modules - Complete all required training modules

Note: You will only be able to view job assignments once all onboarding steps are completed.

WHAT YOU CAN USE THE PORTAL FOR
- Update your personal and banking details
- View your assigned cleaning jobs and schedule
- Update your job status (On the way, Arrived, Completed)
- View your KPI scores and performance metrics
- Access and download your salary slips
- Check your 13th cheque eligibility status
- Communicate with admin and support

If you have any questions, please contact admin support.
Welcome aboard!
`;
  const emailResult = await sendEmail(email, emailSubject, emailHtml, preferences);

  return { whatsapp: waResult, email: emailResult };
}

export async function notifyAdminRejected(phone: string, name: string, reason?: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'admin_rejected', { name, reason: reason || 'Not specified' }, preferences, db);
}

export async function notifyProfileCreated(phone: string, name: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'profile_created', { name }, preferences, db);
}

export async function notifyContractSigned(phone: string, name: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'contract_signed', { name }, preferences, db);
}

export async function notifyTrainingCompleted(phone: string, name: string, certHash: string, preferences?: NotificationPreferences, db?: any): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'training_completed', { name, cert_hash: certHash }, preferences, db);
}
