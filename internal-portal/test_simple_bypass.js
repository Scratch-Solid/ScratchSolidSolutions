// Test endpoint that might bypass middleware
const testSimpleBypass = async () => {
  try {
    console.log('Testing simple bypass endpoint...');
    const response = await fetch('https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/test-simple', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', text);

    if (response.status === 200) {
      console.log('✅ BYPASS SUCCESSFUL - middleware not blocking this path');
    } else {
      console.log('❌ BYPASS FAILED - middleware still blocking');
    }

  } catch (error) {
    console.error('Bypass test error:', error);
  }
};

testSimpleBypass();
