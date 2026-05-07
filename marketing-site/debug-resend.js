// Debug Resend API directly
const { Resend } = require('resend');

async function debugResend() {
  try {
    console.log('Testing Resend API directly...');
    
    // Get API key from environment
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY not found in environment');
      return;
    }
    
    console.log('API Key found:', apiKey.substring(0, 10) + '...');
    
    const resend = new Resend(apiKey);
    
    const result = await resend.emails.send({
      from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>',
      to: 'test@example.com',
      subject: 'Test Email - Scratch Solid Solutions',
      html: '<h1>Test Email</h1><p>This is a test email to verify Resend integration.</p>',
    });
    
    console.log('Resend API response:', result);
    
    if (result.error) {
      console.error('Resend API error:', result.error);
    } else {
      console.log('Email sent successfully!');
    }
    
  } catch (error) {
    console.error('Debug Resend error:', error);
  }
}

debugResend();
