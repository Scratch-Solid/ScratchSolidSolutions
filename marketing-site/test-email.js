// Test email service
const { sendPasswordResetEmail } = require('./src/lib/email');

async function testEmail() {
  try {
    console.log('Testing email service...');
    const result = await sendPasswordResetEmail('test@example.com', 'https://scratchsolidsolutions.org/reset-password?token=test-123');
    console.log('Email result:', result);
  } catch (error) {
    console.error('Email test error:', error);
  }
}

testEmail();
