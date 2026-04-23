const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@scratchsolid.co.za';

export async function sendWhatsApp(to: string, templateName: string, params: Record<string, string>) {
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
    return { success: response.ok };
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return { success: false, error };
  }
}

export async function sendEmail(to: string, subject: string, body: string) {
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
    return { success: false, error };
  }
}

export async function notifyCleanerStatusChange(cleanerPhone: string, status: string, bookingId: string) {
  const wa = await sendWhatsApp(cleanerPhone, 'status_update', { status, booking_id: bookingId });
  if (!wa.success) await sendEmail(cleanerPhone + '@fallback.com', 'Status Update', `Status changed to ${status} for booking ${bookingId}`);
  return wa;
}

export async function notifyPaymentReminder(clientPhone: string, clientEmail: string, amount: string, dueDate: string) {
  const wa = await sendWhatsApp(clientPhone, 'payment_reminder', { amount, due_date: dueDate });
  if (!wa.success) await sendEmail(clientEmail, 'Payment Reminder', `Payment of ${amount} due by ${dueDate}`);
  return wa;
}

export async function notifyAdminFailure(adminEmail: string, action: string, error: string) {
  return sendEmail(adminEmail, 'Admin Action Failure', `Action "${action}" failed with error: ${error}`);
}
