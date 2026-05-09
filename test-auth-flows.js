/**
 * End-to-End Authentication Testing
 * Tests marketing site and internal portal auth flows
 */

const BASE_URL = {
  marketing: 'http://localhost:3000',
  portal: 'http://localhost:3001',
  backend: 'https://cleaning-service-backend.sparkling-darkness-405f.workers.dev'
};

async function testMarketingLogin() {
  console.log('\n=== Testing Marketing Site Login ===');
  
  try {
    const response = await fetch(`${BASE_URL.marketing}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.ok && data.token) {
      console.log('✓ Marketing site login successful');
      return data.token;
    } else {
      console.log('✗ Marketing site login failed');
      return null;
    }
  } catch (error) {
    console.error('✗ Marketing site login error:', error.message);
    return null;
  }
}

async function testPortalLogin() {
  console.log('\n=== Testing Internal Portal Login ===');
  
  try {
    const response = await fetch(`${BASE_URL.portal}/api/auth/login-better-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.ok && data.success && data.data?.session?.token) {
      console.log('✓ Internal portal login successful');
      return data.data.session.token;
    } else {
      console.log('✗ Internal portal login failed');
      return null;
    }
  } catch (error) {
    console.error('✗ Internal portal login error:', error.message);
    return null;
  }
}

async function testMarketingForgotPassword() {
  console.log('\n=== Testing Marketing Site Forgot Password ===');
  
  try {
    const response = await fetch(`${BASE_URL.marketing}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.ok) {
      console.log('✓ Marketing site forgot password initiated');
    } else {
      console.log('✗ Marketing site forgot password failed');
    }
  } catch (error) {
    console.error('✗ Marketing site forgot password error:', error.message);
  }
}

async function testPortalForgotPassword() {
  console.log('\n=== Testing Internal Portal Forgot Password ===');
  
  try {
    const response = await fetch(`${BASE_URL.portal}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.ok) {
      console.log('✓ Internal portal forgot password initiated');
    } else {
      console.log('✗ Internal portal forgot password failed');
    }
  } catch (error) {
    console.error('✗ Internal portal forgot password error:', error.message);
  }
}

async function testBackendAuth() {
  console.log('\n=== Testing Backend Worker Auth ===');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${BASE_URL.backend}/health`);
    console.log('Backend Health Status:', healthResponse.status);
    
    if (healthResponse.ok) {
      console.log('✓ Backend worker is healthy');
    } else {
      console.log('✗ Backend worker health check failed');
    }
  } catch (error) {
    console.error('✗ Backend worker error:', error.message);
  }
}

async function runAllTests() {
  console.log('=== End-to-End Authentication Testing ===\n');
  
  await testBackendAuth();
  await testMarketingLogin();
  await testPortalLogin();
  await testMarketingForgotPassword();
  await testPortalForgotPassword();
  
  console.log('\n=== Testing Complete ===');
}

runAllTests().catch(console.error);
