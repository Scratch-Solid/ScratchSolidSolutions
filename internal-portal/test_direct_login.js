// Test direct admin credentials
const testDirectLogin = async () => {
  try {
    console.log('Testing direct login with hardcoded credentials...');
    
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

    if (response.status === 200) {
      console.log('✅ LOGIN SUCCESSFUL!');
      const result = JSON.parse(text);
      console.log('User:', result.name);
      console.log('Role:', result.role);
      console.log('Token:', result.token ? 'Generated' : 'Missing');
    } else {
      console.log('❌ LOGIN FAILED - Status:', response.status);
    }

  } catch (error) {
    console.error('Login test error:', error);
  }
};

testDirectLogin();
