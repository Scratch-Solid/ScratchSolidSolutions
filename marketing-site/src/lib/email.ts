// Email service using Resend API
import { Resend } from 'resend';
import { logger } from './logger';
import { getResendApiKey } from './env';

const resend = new Resend(getResendApiKey());

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: from || 'Scratch Solid Solutions <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      logger.error('Error sending email', error as Error);
      return { success: false, message: 'Failed to send email', error };
    }

    return { success: true, data };
  } catch (error) {
    logger.error('Error sending email', error as Error);
    return { success: false, message: 'Failed to send email', error };
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Scratch Solid Solutions</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>You recently requested to reset your password for your Scratch Solid Solutions account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request this password reset, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Scratch Solid Solutions',
    html,
  });
}
