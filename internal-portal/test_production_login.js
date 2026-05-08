// Test production admin login
const testProductionLogin = async () => {
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

    const result1 = await response1.json();
    console.log('Jason Tshaka Login Result:', response1.status, result1);

    console.log('\nTesting Arnica Nqayi login...');
    const response2 = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'customerservice@scratchsolidsolutions.org',
        password: '0746998097'
      })
    });

    const result2 = await response2.json();
    console.log('Arnica Nqayi Login Result:', response2.status, result2);

  } catch (error) {
    console.error('Login test error:', error);
  }
};

testProductionLogin();
