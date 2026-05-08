// Test simple login endpoint
const testSimpleLogin = async () => {
  try {
    console.log('Testing simple login endpoint...');
    const response = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'it@scratchsolidsolutions.org',
        password: '0736417176'
      })
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', text);

  } catch (error) {
    console.error('Login test error:', error);
  }
};

testSimpleLogin();
