const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@scratchsolid.co.za';

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

export async function sendWhatsApp(to: string, templateName: string, params: Record<string, string>, preferences?: NotificationPreferences): Promise<NotificationResult> {
  if (preferences && !preferences.whatsapp) {
    return { success: false, skipped: true, skipReason: 'WhatsApp notifications disabled' };
  }
  if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_ID) return { success: false, error: 'WhatsApp not configured' };
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WHATSAPP_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: { name: templateName, language: { code: 'en' }, components: [{ type: 'body', parameters: Object.entries(params).map(([_, value]) => ({ type: 'text', text: value })) }] }
      }),
    });
    const data = await response.json() as { messages?: Array<{ id: string }> };
    return { success: response.ok, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendEmail(to: string, subject: string, body: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  if (preferences && !preferences.email) {
    return { success: false, skipped: true, skipReason: 'Email notifications disabled' };
  }
  if (!EMAIL_API_KEY) return { success: false, error: 'Email not configured' };
  try {
    const hasHtml = /<[a-z][\s\S]*>/i.test(body);
    const content = hasHtml
      ? [{ type: 'text/plain', value: body.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim() }, { type: 'text/html', value: body }]
      : [{ type: 'text/plain', value: body }];
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: EMAIL_FROM }, subject, content }),
    });
    return { success: response.ok };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: String(error) };
  }
}

export async function notifyCleanerStatusChange(cleanerPhone: string, status: string, bookingId: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  const wa = await sendWhatsApp(cleanerPhone, 'status_update', { status, booking_id: bookingId }, preferences);
  if (!wa.success && !wa.skipped) await sendEmail(cleanerPhone + '@fallback.com', 'Status Update', `Status changed to ${status} for booking ${bookingId}`, preferences);
  return wa;
}

export async function notifyPaymentReminder(clientPhone: string, clientEmail: string, amount: string, dueDate: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  const wa = await sendWhatsApp(clientPhone, 'payment_reminder', { amount, due_date: dueDate }, preferences);
  if (!wa.success && !wa.skipped) await sendEmail(clientEmail, 'Payment Reminder', `Payment of ${amount} due by ${dueDate}`, preferences);
  return wa;
}

export async function notifyAdminFailure(adminEmail: string, action: string, error: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendEmail(adminEmail, 'Admin Action Failure', `Action "${action}" failed with error: ${error}`, preferences);
}

// Onboarding notification functions
export async function notifyConsentSubmitted(phone: string, name: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'consent_submitted', { name }, preferences);
}

export async function notifyAdminApproved(phone: string, name: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'admin_approved', { name }, preferences);
}

export async function sendCleanerWelcome(phone: string, email: string, name: string, paysheetCode: string, tempPassword: string, preferences?: NotificationPreferences): Promise<{ whatsapp: NotificationResult; email: NotificationResult }> {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

  // WhatsApp: concise welcome with key credentials
  const waParams = {
    name,
    paysheet_code: paysheetCode,
    temp_password: tempPassword,
    portal_url: portalUrl,
  };
  const waResult = await sendWhatsApp(phone, 'cleaner_welcome', waParams, preferences);

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
  const emailResult = await sendEmail(email, emailSubject, emailText, preferences);

  return { whatsapp: waResult, email: emailResult };
}

export async function notifyAdminRejected(phone: string, name: string, reason?: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'admin_rejected', { name, reason: reason || 'Not specified' }, preferences);
}

export async function notifyProfileCreated(phone: string, name: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'profile_created', { name }, preferences);
}

export async function notifyContractSigned(phone: string, name: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'contract_signed', { name }, preferences);
}

export async function notifyTrainingCompleted(phone: string, name: string, certHash: string, preferences?: NotificationPreferences): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'training_completed', { name, cert_hash: certHash }, preferences);
}
