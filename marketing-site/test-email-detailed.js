// Detailed test of password reset flow
async function testPasswordReset() {
  try {
    console.log('=== Testing Password Reset Flow ===');
    
    // Test forgot password endpoint
    const response = await fetch('https://scratchsolidsolutions.sparkling-darkness-405f.workers.dev/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://scratchsolidsolutions.org'
      },
      body: JSON.stringify({
        type: 'business',
        identifier: 'test@example.com'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Response is not JSON:', text);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testPasswordReset();
