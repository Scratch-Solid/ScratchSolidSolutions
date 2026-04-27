/**
 * Notification Service
 * Handles WhatsApp (primary) and email (fallback) notifications
 */

interface NotificationPayload {
  recipient: {
    phone?: string;
    email?: string;
    name?: string;
  };
  type: 'cleaner_status' | 'payment_overdue' | 'pop_verified' | 'booking_confirmed' | 'booking_cancelled' | 'invoice_sent';
  data: {
    booking_id?: number;
    status?: string;
    amount?: number;
    due_date?: string;
    [key: string]: any;
  };
}

export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; method: string; error?: string }> {
  const { recipient, type, data } = payload;

  // Try WhatsApp first
  if (recipient.phone) {
    const whatsappResult = await sendWhatsApp(recipient.phone, type, data);
    if (whatsappResult.success) {
      return { success: true, method: 'whatsapp' };
    }
    console.warn('WhatsApp failed, falling back to email:', whatsappResult.error);
  }

  // Fallback to email
  if (recipient.email) {
    const emailResult = await sendEmail(recipient.email, recipient.name || 'Customer', type, data);
    if (emailResult.success) {
      return { success: true, method: 'email' };
    }
    return { success: false, method: 'email', error: emailResult.error };
  }

  return { success: false, method: 'none', error: 'No contact method available' };
}

async function sendWhatsApp(phone: string, type: string, data: any): Promise<{ success: boolean; error?: string }> {
  try {
    const message = formatWhatsAppMessage(type, data);
    
    // Call WhatsApp API (e.g., Twilio, MessageBird, or direct WhatsApp Business API)
    const response = await fetch(process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY || ''}`
      },
      body: JSON.stringify({
        to: phone,
        message: message,
        type: 'text'
      })
    });

    if (response.ok) {
      return { success: true };
    }

    const error = await response.text();
    return { success: false, error };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function sendEmail(email: string, name: string, type: string, data: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { subject, body } = formatEmailMessage(name, type, data);
    
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        body,
        type: 'notification'
      })
    });

    if (response.ok) {
      return { success: true };
    }

    const error = await response.text();
    return { success: false, error };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function formatWhatsAppMessage(type: string, data: any): string {
  switch (type) {
    case 'cleaner_status':
      const statusMap: Record<string, string> = {
        'on_way': 'on the way',
        'arrived': 'arrived at your location',
        'completed': 'completed the cleaning service'
      };
      return `Scratch Solid: Your cleaner is now ${statusMap[data.status] || data.status}. Booking #${data.booking_id}.`;
    
    case 'payment_overdue':
      return `Scratch Solid: Payment of R${data.amount} for booking #${data.booking_id} is overdue. Due date: ${data.due_date}. Please make payment to avoid cancellation.`;
    
    case 'pop_verified':
      return `Scratch Solid: Your proof of payment has been verified! Your cleaner will be dispatched shortly. Booking #${data.booking_id}.`;
    
    case 'booking_confirmed':
      return `Scratch Solid: Your booking for ${data.booking_date} at ${data.booking_time} has been confirmed! We look forward to serving you.`;
    
    case 'booking_cancelled':
      return `Scratch Solid: Your booking #${data.booking_id} has been cancelled. ${data.reason || ''}`;
    
    case 'invoice_sent':
      return `Scratch Solid: Invoice #${data.invoice_number} for R${data.amount} has been sent. Due date: ${data.due_date}.`;
    
    default:
      return `Scratch Solid: Update regarding your booking #${data.booking_id}.`;
  }
}

function formatEmailMessage(name: string, type: string, data: any): { subject: string; body: string } {
  const baseSubject = 'Scratch Solid - ';
  
  switch (type) {
    case 'cleaner_status':
      const statusMap: Record<string, string> = {
        'on_way': 'On the Way',
        'arrived': 'Cleaner Arrived',
        'completed': 'Service Completed'
      };
      return {
        subject: baseSubject + (statusMap[data.status] || 'Cleaner Status Update'),
        body: `Dear ${name},\n\nYour cleaner is now ${statusMap[data.status] || data.status}.\n\nBooking ID: ${data.booking_id}\n\nThank you for choosing Scratch Solid!`
      };
    
    case 'payment_overdue':
      return {
        subject: baseSubject + 'Payment Overdue Reminder',
        body: `Dear ${name},\n\nYour payment of R${data.amount} for booking #${data.booking_id} is overdue.\n\nDue date: ${data.due_date}\n\nPlease make payment immediately to avoid automatic cancellation of your booking.\n\nThank you,\nScratch Solid Team`
      };
    
    case 'pop_verified':
      return {
        subject: baseSubject + 'Proof of Payment Verified',
        body: `Dear ${name},\n\nYour proof of payment has been verified successfully!\n\nYour cleaner will be dispatched shortly.\n\nBooking ID: ${data.booking_id}\n\nThank you for choosing Scratch Solid!`
      };
    
    case 'booking_confirmed':
      return {
        subject: baseSubject + 'Booking Confirmed',
        body: `Dear ${name},\n\nYour booking has been confirmed!\n\nDate: ${data.booking_date}\nTime: ${data.booking_time}\nService: ${data.service_type}\n\nWe look forward to serving you.\n\nScratch Solid Team`
      };
    
    case 'booking_cancelled':
      return {
        subject: baseSubject + 'Booking Cancelled',
        body: `Dear ${name},\n\nYour booking #${data.booking_id} has been cancelled.\n\n${data.reason ? `Reason: ${data.reason}\n\n` : ''}If you have any questions, please contact us.\n\nScratch Solid Team`
      };
    
    case 'invoice_sent':
      return {
        subject: baseSubject + 'Invoice Sent',
        body: `Dear ${name},\n\nInvoice #${data.invoice_number} for R${data.amount} has been sent to you.\n\nDue date: ${data.due_date}\n\nPlease ensure payment is made on time to avoid service disruption.\n\nThank you,\nScratch Solid Team`
      };
    
    default:
      return {
        subject: baseSubject + 'Update',
        body: `Dear ${name},\n\nYou have an update regarding your booking #${data.booking_id}.\n\nPlease check your dashboard for details.\n\nScratch Solid Team`
      };
  }
}
