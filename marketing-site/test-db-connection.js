// Test database connection and user lookup
async function testDBConnection() {
  try {
    console.log('Testing database connection...');
    
    const response = await fetch('https://api.scratchsolidsolutions.org/api/test-db-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://scratchsolidsolutions.org'
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('DB connection test result:', result);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDBConnection();
