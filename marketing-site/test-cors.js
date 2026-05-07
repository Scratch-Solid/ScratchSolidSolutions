// Test CORS and different origins
async function testCORS() {
  const origins = [
    'https://scratchsolidsolutions.org',
    'https://scratchsolidsolutions.sparkling-darkness-405f.workers.dev',
    'https://scratchsolidsolutions.sparkling-darkness-405f.workers.dev/api/auth/forgot-password'
  ];
  
  for (const origin of origins) {
    try {
      console.log(`\n=== Testing with Origin: ${origin} ===`);
      
      const response = await fetch('https://scratchsolidsolutions.sparkling-darkness-405f.workers.dev/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin,
          'Referer': origin
        },
        body: JSON.stringify({
          type: 'business',
          identifier: 'test@example.com'
        })
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log(`Response length: ${text.length}`);
      console.log(`Response preview: ${text.substring(0, 200)}...`);
      
    } catch (error) {
      console.error(`Error with ${origin}:`, error.message);
    }
  }
}

testCORS();
