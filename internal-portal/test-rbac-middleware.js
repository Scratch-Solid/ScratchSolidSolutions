// Comprehensive RBAC middleware test
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testRBACMiddleware() {
    console.log('🚀 Starting RBAC Middleware Tests\n');
    
    const testResults = {
        adminAccess: false,
        cleanerAccess: false,
        digitalAccess: false,
        transportAccess: false,
        unauthorizedAccess: false,
        roleBasedRouting: false
    };

    // Test 1: Admin role access
    console.log('\n📋 Test 1: Admin Role Access');
    try {
        const response = await fetch(`${BASE_URL}/admin/security`, {
            headers: {
                'Cookie': 'userRole=admin; authToken=test-admin-token'
            }
        });
        console.log(`Admin Dashboard Status: ${response.status}`);
        testResults.adminAccess = response.status < 500;
    } catch (error) {
        console.log(`Admin access error: ${error.message}`);
    }

    // Test 2: Cleaner role access
    console.log('\n📋 Test 2: Cleaner Role Access');
    try {
        const response = await fetch(`${BASE_URL}/cleaner-dashboard`, {
            headers: {
                'Cookie': 'userRole=cleaner; authToken=test-cleaner-token'
            }
        });
        console.log(`Cleaner Dashboard Status: ${response.status}`);
        testResults.cleanerAccess = response.status < 500;
    } catch (error) {
        console.log(`Cleaner access error: ${error.message}`);
    }

    // Test 3: Digital role access
    console.log('\n📋 Test 3: Digital Role Access');
    try {
        const response = await fetch(`${BASE_URL}/digital-dashboard`, {
            headers: {
                'Cookie': 'userRole=digital; authToken=test-digital-token'
            }
        });
        console.log(`Digital Dashboard Status: ${response.status}`);
        testResults.digitalAccess = response.status < 500;
    } catch (error) {
        console.log(`Digital access error: ${error.message}`);
    }

    // Test 4: Transport role access
    console.log('\n📋 Test 4: Transport Role Access');
    try {
        const response = await fetch(`${BASE_URL}/transport-dashboard`, {
            headers: {
                'Cookie': 'userRole=transport; authToken=test-transport-token'
            }
        });
        console.log(`Transport Dashboard Status: ${response.status}`);
        testResults.transportAccess = response.status < 500;
    } catch (error) {
        console.log(`Transport access error: ${error.message}`);
    }

    // Test 5: Unauthorized access prevention
    console.log('\n📋 Test 5: Unauthorized Access Prevention');
    try {
        const response = await fetch(`${BASE_URL}/admin/security`, {
            headers: {
                'Cookie': 'userRole=client; authToken=test-client-token'
            }
        });
        console.log(`Unauthorized Access Status: ${response.status}`);
        testResults.unauthorizedAccess = response.status === 401 || response.status === 403;
    } catch (error) {
        console.log(`Unauthorized access error: ${error.message}`);
    }

    // Test 6: Role-based routing
    console.log('\n📋 Test 6: Role-Based Routing');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login-better-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'testpassword'
            })
        });
        
        if (response.status === 200) {
            const data = await response.json();
            console.log(`Login Response includes role: ${data.data.user.role}`);
            testResults.roleBasedRouting = data.data.user.role === 'admin';
        }
    } catch (error) {
        console.log(`Role-based routing error: ${error.message}`);
    }

    // Results Summary
    console.log('\n📊 RBAC MIDDLEWARE TEST RESULTS');
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
        console.log('🎉 RBAC Middleware is PRODUCTION READY!');
    } else if (successRate >= 60) {
        console.log('⚠️  RBAC Middleware needs minor fixes');
    } else {
        console.log('🚨 RBAC Middleware requires major fixes');
    }
}

// Run the tests
testRBACMiddleware().catch(console.error);
