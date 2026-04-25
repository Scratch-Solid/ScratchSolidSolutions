// Email service using Resend API
import { Resend } from 'resend';
import { logger } from './logger';
import { getResendApiKey } from './env';

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(getResendApiKey());
  }
  return resend;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
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

export async function sendBookingConfirmationEmail(email: string, clientName: string, bookingDate: string, bookingTime: string, location: string, serviceType: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .detail { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #2563eb; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Scratch Solid Solutions</h1>
        </div>
        <div class="content">
          <h2>Booking Confirmed!</h2>
          <p>Dear ${clientName},</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          <div class="detail">
            <strong>Date:</strong> ${bookingDate}<br>
            <strong>Time:</strong> ${bookingTime}<br>
            <strong>Location:</strong> ${location}<br>
            <strong>Service:</strong> ${serviceType}
          </div>
          <p>Please ensure the location is accessible at the scheduled time. Our team will arrive on time to provide excellent service.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
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
    subject: 'Booking Confirmed - Scratch Solid Solutions',
    html,
    from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>'
  });
}

export async function sendPaymentReceiptEmail(email: string, clientName: string, amount: number, paymentDate: string, bookingId: number) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .receipt { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; border: 2px solid #10b981; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Receipt</h1>
        </div>
        <div class="content">
          <h2>Payment Successful</h2>
          <p>Dear ${clientName},</p>
          <p>Your payment has been successfully processed. Here is your receipt:</p>
          <div class="receipt">
            <strong>Receipt ID:</strong> ${bookingId}<br>
            <strong>Amount:</strong> R ${amount.toFixed(2)}<br>
            <strong>Date:</strong> ${paymentDate}<br>
            <strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">PAID</span>
          </div>
          <p>Thank you for your payment. Please keep this receipt for your records.</p>
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
    subject: 'Payment Receipt - Scratch Solid Solutions',
    html,
    from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>'
  });
}

export async function sendAdminAlertEmail(clientName: string, bookingDate: string, bookingTime: string, location: string, serviceType: string, clientEmail: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .detail { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #dc2626; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Booking Alert</h1>
        </div>
        <div class="content">
          <h2>New Booking Received</h2>
          <p>A new booking has been submitted. Details:</p>
          <div class="detail">
            <strong>Client:</strong> ${clientName}<br>
            <strong>Email:</strong> ${clientEmail}<br>
            <strong>Date:</strong> ${bookingDate}<br>
            <strong>Time:</strong> ${bookingTime}<br>
            <strong>Location:</strong> ${location}<br>
            <strong>Service:</strong> ${serviceType}
          </div>
          <p>Please review and confirm this booking in the admin dashboard.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: 'it@scratchsolidsolutions.org',
    subject: 'New Booking Alert - Scratch Solid Solutions',
    html,
    from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>'
  });
}
