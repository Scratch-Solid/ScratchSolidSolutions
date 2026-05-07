// Test password reset API
const testPasswordReset = async () => {
  try {
    const response = await fetch('https://scratchsolidsolutions.sparkling-darkness-405f.workers.dev/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'business',
        identifier: 'test@example.com'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

testPasswordReset();
