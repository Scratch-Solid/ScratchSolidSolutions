// Email Service Utility
// Provides email sending functionality for notifications, password resets, etc.

import { getCloudflareContext } from './runtime-context';

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
  adminInvite: (inviteLink: string, invitedByName: string) => { subject: string; html: string; text: string };
}

async function getCloudflareSecret(name: string): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    return (env as any)?.[name] || process.env[name];
  } catch {
    return process.env[name];
  }
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
  }),

  adminInvite: (inviteLink: string, invitedByName: string) => ({
    subject: 'You\'ve been invited as an admin - Scratch Solid Solutions',
    html: `
      <h2>Admin Invitation</h2>
      <p>${invitedByName} has invited you to join Scratch Solid Solutions' internal portal as an admin.</p>
      <p>Click the link below to set your password and get started:</p>
      <a href="${inviteLink}">Accept Invitation</a>
      <p>This link will expire in 7 days.</p>
      <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
    `,
    text: `${invitedByName} has invited you to join Scratch Solid Solutions as an admin: ${inviteLink}`
  })
};

const EMAIL_FROM = 'Scratch Solid Solutions <noreply@scratchsolidsolutions.org>';

/**
 * Send email via Resend.
 *
 * @param options - Email options
 * @returns Promise resolving to success status
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = await getCloudflareSecret('RESEND_API_KEY');
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured - email not sent', { to: options.to, subject: options.subject });
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Resend API error', { status: response.status, errorBody });
      return { success: false, error: `Email provider error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send email', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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

/**
 * Send admin invite email
 */
export async function sendAdminInviteEmail(email: string, inviteLink: string, invitedByName: string): Promise<{ success: boolean; error?: string }> {
  const template = emailTemplates.adminInvite(inviteLink, invitedByName);
  return sendEmail({ to: email, ...template });
}
