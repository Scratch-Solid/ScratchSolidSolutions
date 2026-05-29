const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@scratchsolid.co.za';

export interface NotificationResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export async function sendWhatsApp(to: string, templateName: string, params: Record<string, string>): Promise<NotificationResult> {
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

export async function sendEmail(to: string, subject: string, body: string): Promise<NotificationResult> {
  if (!EMAIL_API_KEY) return { success: false, error: 'Email not configured' };
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: EMAIL_FROM }, subject, content: [{ type: 'text/plain', value: body }] }),
    });
    return { success: response.ok };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: String(error) };
  }
}

export async function notifyCleanerStatusChange(cleanerPhone: string, status: string, bookingId: string): Promise<NotificationResult> {
  const wa = await sendWhatsApp(cleanerPhone, 'status_update', { status, booking_id: bookingId });
  if (!wa.success) await sendEmail(cleanerPhone + '@fallback.com', 'Status Update', `Status changed to ${status} for booking ${bookingId}`);
  return wa;
}

export async function notifyPaymentReminder(clientPhone: string, clientEmail: string, amount: string, dueDate: string): Promise<NotificationResult> {
  const wa = await sendWhatsApp(clientPhone, 'payment_reminder', { amount, due_date: dueDate });
  if (!wa.success) await sendEmail(clientEmail, 'Payment Reminder', `Payment of ${amount} due by ${dueDate}`);
  return wa;
}

export async function notifyAdminFailure(adminEmail: string, action: string, error: string): Promise<NotificationResult> {
  return sendEmail(adminEmail, 'Admin Action Failure', `Action "${action}" failed with error: ${error}`);
}

// Onboarding notification functions
export async function notifyConsentSubmitted(phone: string, name: string): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'consent_submitted', { name });
}

export async function notifyAdminApproved(phone: string, name: string): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'admin_approved', { name });
}

export async function notifyAdminRejected(phone: string, name: string, reason?: string): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'admin_rejected', { name, reason: reason || 'Not specified' });
}

export async function notifyProfileCreated(phone: string, name: string): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'profile_created', { name });
}

export async function notifyContractSigned(phone: string, name: string): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'contract_signed', { name });
}

export async function notifyTrainingCompleted(phone: string, name: string, certHash: string): Promise<NotificationResult> {
  return sendWhatsApp(phone, 'training_completed', { name, cert_hash: certHash });
}
