// Test Resend API key validity
async function testResendAPI() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('RESEND_API_KEY not found in environment');
    return;
  }

  console.log('Testing Resend API with key:', apiKey.substring(0, 10) + '...');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>',
        to: ['test@example.com'],
        subject: 'Test Email',
        html: '<p>This is a test email</p>',
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', result);
    } else {
      console.log('Resend API success:', result);
    }
  } catch (error) {
    console.error('Error testing Resend API:', error);
  }
}

testResendAPI();
