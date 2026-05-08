// Test minimal ping endpoint to isolate infrastructure issues
const testPingEndpoint = async () => {
  try {
    console.log('Testing minimal ping endpoint...');
    const response = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/ping', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', text);

    if (response.status === 200) {
      console.log('✅ MINIMAL ENDPOINT WORKING - issue is with complex endpoints');
    } else {
      console.log('❌ EVEN MINIMAL ENDPOINT FAILING - fundamental infrastructure issue');
    }

  } catch (error) {
    console.error('Ping test error:', error);
  }
};

testPingEndpoint();
