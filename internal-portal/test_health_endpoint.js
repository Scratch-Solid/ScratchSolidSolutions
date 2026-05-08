// Test health endpoint to diagnose server issues
const testHealthEndpoint = async () => {
  try {
    console.log('Testing health endpoint...');
    const response = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', text);

    if (response.status === 200) {
      console.log('✅ SERVER IS WORKING');
      const result = JSON.parse(text);
      console.log('Database status:', result.checks?.database);
      console.log('Overall status:', result.status);
    } else {
      console.log('❌ SERVER ISSUES DETECTED');
    }

  } catch (error) {
    console.error('Health test error:', error);
  }
};

testHealthEndpoint();
