// Debug production admin login
const debugLogin = async () => {
  try {
    console.log('Testing Jason Tshaka login...');
    const response1 = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'it@scratchsolidsolutions.org',
        password: '0736417176'
      })
    });

    console.log('Response status:', response1.status);
    console.log('Response headers:', Object.fromEntries(response1.headers.entries()));
    
    const text = await response1.text();
    console.log('Response text:', text.substring(0, 500) + '...');

  } catch (error) {
    console.error('Login test error:', error);
  }
};

debugLogin();
