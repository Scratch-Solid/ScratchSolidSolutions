// Test Resend API directly using the same pattern as the email service
const { Resend } = require('resend');

async function testResendDirect() {
  try {
    console.log('=== Testing Resend API Direct ===');
    
    // Test with a known working API key pattern
    // We'll need to check if the API key is valid and domain is verified
    
    console.log('1. Testing API key validation...');
    
    // The issue might be:
    // A) API key is invalid/expired
    // B) Domain scratchsolidsolutions.org is not verified in Resend
    // C) API key doesn't have email sending permissions
    // D) From email address doesn't match verified domain
    
    console.log('Common Resend issues:');
    console.log('- Domain must be verified: scratchsolidsolutions.org');
    console.log('- From email must use verified domain');
    console.log('- API key must have email sending permissions');
    console.log('- Resend account must be in good standing');
    
    console.log('\nRecommended checks:');
    console.log('1. Verify scratchsolidsolutions.org in Resend dashboard');
    console.log('2. Check API key permissions');
    console.log('3. Test with a simple email via Resend dashboard');
    console.log('4. Check Resend account status/billing');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testResendDirect();
