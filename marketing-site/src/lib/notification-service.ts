// Notification Service
// Phase 4: Twilio WhatsApp Integration
// Cost-optimized notification service with WhatsApp, SMS, and email support

export interface NotificationConfig {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsAppNumber?: string;
  twilioSmsNumber?: string;
  resendApiKey?: string;
}

export interface NotificationRequest {
  to: string; // Phone number in E.164 format
  method: 'whatsapp' | 'sms' | 'email';
  message: string;
  templateId?: string; // For WhatsApp templates
  templateParams?: Record<string, string>;
  subject?: string; // For email
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  method: string;
}

export interface OptInStatus {
  phoneNumber: string;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  emailOptIn: boolean;
  optInDate?: string;
  optOutDate?: string;
}

/**
 * Send notification via WhatsApp
 */
export async function sendWhatsApp(
  to: string,
  message: string,
  config: NotificationConfig
): Promise<NotificationResult> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioWhatsAppNumber) {
    return {
      success: false,
      error: 'Twilio credentials not configured',
      method: 'whatsapp'
    };
  }

  try {
    // In a real implementation, this would call Twilio API
    // For now, we'll simulate the call
    console.log(`[WhatsApp] To: ${to}, Message: ${message}`);
    
    return {
      success: true,
      messageId: `WA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: 'whatsapp'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'whatsapp'
    };
  }
}

/**
 * Send notification via SMS
 */
export async function sendSMS(
  to: string,
  message: string,
  config: NotificationConfig
): Promise<NotificationResult> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioSmsNumber) {
    return {
      success: false,
      error: 'Twilio credentials not configured',
      method: 'sms'
    };
  }

  try {
    // In a real implementation, this would call Twilio API
    console.log(`[SMS] To: ${to}, Message: ${message}`);
    
    return {
      success: true,
      messageId: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: 'sms'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'sms'
    };
  }
}

/**
 * Send notification via Email
 */
export async function sendEmail(
  to: string,
  message: string,
  config: NotificationConfig,
  subject?: string
): Promise<NotificationResult> {
  if (!config.resendApiKey) {
    return {
      success: false,
      error: 'Resend API key not configured',
      method: 'email'
    };
  }

  try {
    // In a real implementation, this would call Resend API
    console.log(`[Email] To: ${to}, Subject: ${subject}`);
    
    return {
      success: true,
      messageId: `EMAIL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: 'email'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'email'
    };
  }
}

/**
 * Send notification with automatic fallback
 * Tries WhatsApp first, then SMS, then email
 */
export async function sendNotification(
  request: NotificationRequest,
  config: NotificationConfig
): Promise<NotificationResult> {
  const methods: Array<'whatsapp' | 'sms' | 'email'> = ['whatsapp', 'sms', 'email'];
  const startIndex = methods.indexOf(request.method);
  
  // Try the requested method first, then fallback to others
  for (let i = startIndex; i < methods.length; i++) {
    const method = methods[i];
    
    if (method === 'whatsapp' && request.method === 'whatsapp') {
      const result = await sendWhatsApp(request.to, request.message, config);
      if (result.success) return result;
    } else if (method === 'sms') {
      const result = await sendSMS(request.to, request.message, config);
      if (result.success) return result;
    } else if (method === 'email') {
      const result = await sendEmail(request.to, request.message, config, request.subject || undefined);
      if (result.success) return result;
    }
  }
  
  return {
    success: false,
    error: 'All notification methods failed',
    method: request.method
  };
}

/**
 * Send quote notification
 */
export async function sendQuoteNotification(
  to: string,
  quoteRef: string,
  serviceName: string,
  price: number,
  config: NotificationConfig
): Promise<NotificationResult> {
  const message = `🎉 Your Quote is Ready!\n\nRef: ${quoteRef}\nService: ${serviceName}\nPrice: R${price.toFixed(2)}\n\nView your quote at: https://scratchsolidsolutions.org/quote/${quoteRef}\n\nReply STOP to opt out of future messages.`;
  
  return sendNotification({
    to,
    method: 'whatsapp',
    message
  }, config);
}

/**
 * Send booking confirmation notification
 */
export async function sendBookingConfirmation(
  to: string,
  bookingId: string,
  serviceName: string,
  date: string,
  time: string,
  config: NotificationConfig
): Promise<NotificationResult> {
  const message = `✅ Booking Confirmed!\n\nBooking ID: ${bookingId}\nService: ${serviceName}\nDate: ${date}\nTime: ${time}\n\nWe'll send you updates as your cleaner approaches.\n\nReply STOP to opt out of future messages.`;
  
  return sendNotification({
    to,
    method: 'whatsapp',
    message
  }, config);
}

/**
 * Send cleaner status update notification
 */
export async function sendCleanerStatusUpdate(
  to: string,
  bookingId: string,
  status: 'on_way' | 'arrived' | 'completed',
  cleanerName: string,
  config: NotificationConfig,
  eta?: string
): Promise<NotificationResult> {
  let message = '';
  
  switch (status) {
    case 'on_way':
      message = `🚗 Cleaner on the way!\n\nBooking ID: ${bookingId}\nCleaner: ${cleanerName}\nETA: ${eta || 'Arriving soon'}\n\nTrack live at: https://scratchsolidsolutions.org/track/${bookingId}`;
      break;
    case 'arrived':
      message = `🏠 Cleaner has arrived!\n\nBooking ID: ${bookingId}\nCleaner: ${cleanerName}\n\nYour cleaning service has started.`;
      break;
    case 'completed':
      message = `✨ Cleaning Complete!\n\nBooking ID: ${bookingId}\nCleaner: ${cleanerName}\n\nThank you for choosing Scratch Solid Solutions!`;
      break;
  }
  
  return sendNotification({
    to,
    method: 'whatsapp',
    message
  }, config);
}

/**
 * Validate phone number format (E.164)
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  const e164Pattern = /^\+[1-9]\d{1,14}$/;
  return e164Pattern.test(phoneNumber);
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let formatted = phoneNumber.replace(/[^\d+]/g, '');
  
  // If starting with 0 (South Africa), replace with +27
  if (formatted.startsWith('0')) {
    formatted = '27' + formatted.substring(1);
  }
  
  // Add + if not present
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  return formatted;
}

/**
 * Check if notification method is available
 */
export function isNotificationMethodAvailable(
  method: 'whatsapp' | 'sms' | 'email',
  config: NotificationConfig
): boolean {
  switch (method) {
    case 'whatsapp':
      return !!(config.twilioAccountSid && config.twilioAuthToken && config.twilioWhatsAppNumber);
    case 'sms':
      return !!(config.twilioAccountSid && config.twilioAuthToken && config.twilioSmsNumber);
    case 'email':
      return !!config.resendApiKey;
  }
}

/**
 * Get available notification methods
 */
export function getAvailableMethods(config: NotificationConfig): Array<'whatsapp' | 'sms' | 'email'> {
  const methods: Array<'whatsapp' | 'sms' | 'email'> = [];
  
  if (isNotificationMethodAvailable('whatsapp', config)) methods.push('whatsapp');
  if (isNotificationMethodAvailable('sms', config)) methods.push('sms');
  if (isNotificationMethodAvailable('email', config)) methods.push('email');
  
  return methods;
}
