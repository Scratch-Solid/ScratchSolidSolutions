// Email Service Utility
// Provides email sending functionality for notifications, password resets, etc.

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTemplate {
  passwordReset: (resetLink: string) => { subject: string; html: string; text: string };
  welcome: (name: string) => { subject: string; html: string; text: string };
  twoFactorCode: (code: string) => { subject: string; html: string; text: string };
  bookingConfirmation: (details: any) => { subject: string; html: string; text: string };
}

/**
 * Email templates
 */
export const emailTemplates: EmailTemplate = {
  passwordReset: (resetLink: string) => ({
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your Scratch Solid Solutions account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
    text: `Password Reset: ${resetLink}`
  }),

  welcome: (name: string) => ({
    subject: 'Welcome to Scratch Solid Solutions',
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Your account has been successfully created.</p>
      <p>You can now access the internal portal using your credentials.</p>
    `,
    text: `Welcome, ${name}! Your account has been successfully created.`
  }),

  twoFactorCode: (code: string) => ({
    subject: 'Your Two-Factor Authentication Code',
    html: `
      <h2>Two-Factor Authentication</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 5 minutes.</p>
    `,
    text: `Your verification code is: ${code}`
  }),

  bookingConfirmation: (details: any) => ({
    subject: 'Booking Confirmation',
    html: `
      <h2>Booking Confirmed</h2>
      <p>Your booking has been confirmed.</p>
      <p>Service: ${details.service}</p>
      <p>Date: ${details.date}</p>
      <p>Time: ${details.time}</p>
    `,
    text: `Booking confirmed for ${details.service} on ${details.date} at ${details.time}`
  })
};

/**
 * Send email (implementation depends on email service provider)
 * This is a placeholder - actual implementation requires SMTP service integration
 * 
 * Supported providers:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Resend
 * 
 * @param options - Email options
 * @returns Promise resolving to success status
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  // Placeholder implementation
  // In production, integrate with email service provider
  
  console.log(`[EMAIL] To: ${options.to}, Subject: ${options.subject}`);
  
  // Example SendGrid integration:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({ to: options.to, from: 'noreply@scrapsolidsolutions.co.za', ...options });
  
  return { success: true };
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<{ success: boolean; error?: string }> {
  const template = emailTemplates.passwordReset(resetLink);
  return sendEmail({ to: email, ...template });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<{ success: boolean; error?: string }> {
  const template = emailTemplates.welcome(name);
  return sendEmail({ to: email, ...template });
}

/**
 * Send 2FA code email
 */
export async function sendTwoFactorCodeEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const template = emailTemplates.twoFactorCode(code);
  return sendEmail({ to: email, ...template });
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(email: string, details: any): Promise<{ success: boolean; error?: string }> {
  const template = emailTemplates.bookingConfirmation(details);
  return sendEmail({ to: email, ...template });
}
