// Test working login endpoint
const testWorkingLogin = async () => {
  try {
    console.log('Testing working login endpoint...');
    const response = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/simple-login', {
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

    if (response.status === 200) {
      console.log('✅ LOGIN SUCCESSFUL!');
    } else {
      console.log('❌ LOGIN FAILED');
    }

  } catch (error) {
    console.error('Login test error:', error);
  }
};

testWorkingLogin();
