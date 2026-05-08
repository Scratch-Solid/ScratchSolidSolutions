// Test if any endpoint works
const testAnyEndpoint = async () => {
  try {
    console.log('Testing if any endpoint works...');
    const response = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', text);

  } catch (error) {
    console.error('Test error:', error);
  }
};

testAnyEndpoint();
