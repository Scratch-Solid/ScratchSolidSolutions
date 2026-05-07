// Test user lookup directly
async function testUserLookup() {
  try {
    console.log('Testing user lookup...');
    
    const response = await fetch('https://api.scratchsolidsolutions.org/api/test-user-lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://scratchsolidsolutions.org'
      },
      body: JSON.stringify({
        type: 'business',
        identifier: 'jasetsha@gmail.com'
      })
    });
    
    const result = await response.json();
    console.log('User lookup result:', result);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUserLookup();
