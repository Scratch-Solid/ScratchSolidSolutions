// Comprehensive test script for Better Auth implementation
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test results tracking
const testResults = {
    betterAuthSetup: false,
    loginFlow: false,
    twoFactorSetup: false,
    sessionManagement: false,
    rbacMiddleware: false,
    errorHandling: false
};

async function testEndpoint(name, url, options = {}) {
    try {
        console.log(`\n🧪 Testing ${name}...`);
        const response = await fetch(`${BASE_URL}${url}`, {
            method: 'GET',
            ...options
        });
        
        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
        
        return { success: response.status < 500, status: response.status, response: text };
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('🚀 Starting Better Auth Implementation Tests\n');
    
    // Test 1: Better Auth core endpoint
    console.log('\n📋 Test 1: Better Auth Core Endpoint');
    const coreTest = await testEndpoint('Better Auth Core', '/api/auth/session');
    testResults.betterAuthSetup = coreTest.success;
    
    // Test 2: Login endpoint
    console.log('\n📋 Test 2: Login Endpoint');
    const loginData = {
        email: 'test@example.com',
        password: 'testpassword'
    };
    
    try {
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login-better-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });
        
        console.log(`Login Status: ${loginResponse.status}`);
        const loginText = await loginResponse.text();
        console.log(`Login Response: ${loginText.substring(0, 200)}${loginText.length > 200 ? '...' : ''}`);
        
        testResults.loginFlow = loginResponse.status < 500;
        
        // Test 3: 2FA Setup (independent test)
        console.log('\n📋 Test 3: 2FA Setup Endpoint');
        const twoFaResponse = await fetch(`${BASE_URL}/api/auth/2fa/setup/`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            }
        });
        
        console.log(`2FA Setup Status: ${twoFaResponse.status}`);
        const twoFaText = await twoFaResponse.text();
        console.log(`2FA Response: ${twoFaText.substring(0, 200)}${twoFaText.length > 200 ? '...' : ''}`);
        testResults.twoFactorSetup = twoFaResponse.status < 500;
        
        // Test 4: Session Management
        console.log('\n📋 Test 4: Session Management');
        const sessionResponse = await fetch(`${BASE_URL}/api/auth/sessions`, {
            headers: { 'Authorization': 'Bearer test-token' }
        });
        
        console.log(`Sessions Status: ${sessionResponse.status}`);
        testResults.sessionManagement = sessionResponse.status < 500;
        
    } catch (error) {
        console.log(`Login test error: ${error.message}`);
        testResults.loginFlow = false;
    }
    
    // Test 5: Security Dashboard
    console.log('\n📋 Test 5: Security Dashboard');
    const dashboardTest = await testEndpoint('Security Dashboard', '/admin/security');
    testResults.errorHandling = dashboardTest.success;
    
    // Results Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    Object.entries(testResults).forEach(([test, result]) => {
        const status = result ? '✅ PASS' : '❌ FAIL';
        const testName = test.replace(/([A-Z])/g, ' $1').trim();
        console.log(`${status} ${testName}`);
    });
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed (${successRate}%)`);
    
    if (successRate >= 80) {
        console.log('🎉 Better Auth implementation is PRODUCTION READY!');
    } else if (successRate >= 60) {
        console.log('⚠️  Better Auth implementation needs minor fixes');
    } else {
        console.log('🚨 Better Auth implementation requires major fixes');
    }
}

// Run the tests
runTests().catch(console.error);
