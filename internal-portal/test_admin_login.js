// Test admin login functionality
const testAdminLogin = async () => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'it@scratchsolidsolutions.org',
      password: '0736417176'
    })
  });

  const result = await response.json();
  console.log('Login Test Result:', result);
  
  if (response.ok) {
    console.log('✅ Admin login successful!');
    console.log('Token:', result.token);
    console.log('User:', result.name);
    console.log('Role:', result.role);
  } else {
    console.log('❌ Admin login failed:', result.error);
  }
};

testAdminLogin();
