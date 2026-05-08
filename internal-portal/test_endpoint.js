// Test if endpoint exists
const testEndpoint = async () => {
  try {
    console.log('Testing if endpoint exists...');
    const response = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/auth/login', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', text.substring(0, 200));

  } catch (error) {
    console.error('Test error:', error);
  }
};

testEndpoint();
