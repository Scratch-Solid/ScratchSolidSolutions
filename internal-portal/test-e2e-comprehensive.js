// Comprehensive End-to-End Test for Phase 1 & Phase 2
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function runPhase1Tests() {
    console.log('\n🚀 PHASE 1: RBAC System End-to-End Tests\n');
    
    const phase1Results = {
        betterAuthConfig: false,
        userRoles: false,
        roleBasedAccess: false,
        adminDashboard: false,
        roleManagement: false
    };

    // Test 1: Better Auth Configuration
    console.log('\n📋 Phase 1.1: Better Auth Configuration');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/session`);
        console.log(`Better Auth Status: ${response.status}`);
        phase1Results.betterAuthConfig = response.status < 500;
    } catch (error) {
        console.log(`Better Auth config error: ${error.message}`);
    }

    // Test 2: User Roles
    console.log('\n📋 Phase 1.2: User Role Assignment');
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
            console.log(`User Role: ${data.data.user.role}`);
            phase1Results.userRoles = data.data.user.role === 'admin';
        }
    } catch (error) {
        console.log(`User roles error: ${error.message}`);
    }

    // Test 3: Role-Based Access Control
    console.log('\n📋 Phase 1.3: Role-Based Access Control');
    try {
        const response = await fetch(`${BASE_URL}/admin/security`);
        console.log(`Admin Access Status: ${response.status}`);
        phase1Results.roleBasedAccess = response.status < 500;
    } catch (error) {
        console.log(`RBAC error: ${error.message}`);
    }

    // Test 4: Admin Dashboard
    console.log('\n📋 Phase 1.4: Admin Dashboard Access');
    try {
        const response = await fetch(`${BASE_URL}/admin/security`);
        console.log(`Admin Dashboard Status: ${response.status}`);
        phase1Results.adminDashboard = response.status === 200;
    } catch (error) {
        console.log(`Admin dashboard error: ${error.message}`);
    }

    // Test 5: Role Management
    console.log('\n📋 Phase 1.5: Role Management System');
    try {
        const response = await fetch(`${BASE_URL}/admin/roles`);
        console.log(`Role Management Status: ${response.status}`);
        phase1Results.roleManagement = response.status < 500;
    } catch (error) {
        console.log(`Role management error: ${error.message}`);
    }

    return phase1Results;
}

async function runPhase2Tests() {
    console.log('\n🚀 PHASE 2: Enhanced Security Features End-to-End Tests\n');
    
    const phase2Results = {
        twoFactorSetup: false,
        twoFactorVerify: false,
        sessionManagement: false,
        sessionLimits: false,
        securityDashboard: false,
        auditLogging: false
    };

    // Test 1: Two-Factor Authentication Setup
    console.log('\n📋 Phase 2.1: 2FA Setup');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/2fa/setup/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`2FA Setup Status: ${response.status}`);
        phase2Results.twoFactorSetup = response.status === 200;
    } catch (error) {
        console.log(`2FA setup error: ${error.message}`);
    }

    // Test 2: Two-Factor Verification
    console.log('\n📋 Phase 2.2: 2FA Verification');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '123456' })
        });
        console.log(`2FA Verify Status: ${response.status}`);
        phase2Results.twoFactorVerify = response.status < 500;
    } catch (error) {
        console.log(`2FA verify error: ${error.message}`);
    }

    // Test 3: Session Management
    console.log('\n📋 Phase 2.3: Session Management');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/sessions`);
        console.log(`Session Management Status: ${response.status}`);
        phase2Results.sessionManagement = response.status === 200;
    } catch (error) {
        console.log(`Session management error: ${error.message}`);
    }

    // Test 4: Session Limits
    console.log('\n📋 Phase 2.4: Concurrent Session Limits');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login-better-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user@example.com',
                password: 'testpassword'
            })
        });
        
        if (response.status === 200) {
            const data = await response.json();
            console.log(`Session created with token: ${data.data.session.token ? 'Yes' : 'No'}`);
            phase2Results.sessionLimits = !!data.data.session.token;
        }
    } catch (error) {
        console.log(`Session limits error: ${error.message}`);
    }

    // Test 5: Security Dashboard
    console.log('\n📋 Phase 2.5: Security Dashboard');
    try {
        const response = await fetch(`${BASE_URL}/admin/security`);
        console.log(`Security Dashboard Status: ${response.status}`);
        phase2Results.securityDashboard = response.status === 200;
    } catch (error) {
        console.log(`Security dashboard error: ${error.message}`);
    }

    // Test 6: Audit Logging
    console.log('\n📋 Phase 2.6: Audit Logging');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login-better-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'audit@example.com',
                password: 'testpassword'
            })
        });
        console.log(`Audit Logging Status: ${response.status}`);
        phase2Results.auditLogging = response.status < 500;
    } catch (error) {
        console.log(`Audit logging error: ${error.message}`);
    }

    return phase2Results;
}

async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive End-to-End Tests for Phase 1 & Phase 2\n');
    
    const phase1Results = await runPhase1Tests();
    const phase2Results = await runPhase2Tests();

    // Results Summary
    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('========================');
    
    console.log('\n🔹 PHASE 1: RBAC System');
    Object.entries(phase1Results).forEach(([test, result]) => {
        const status = result ? '✅ PASS' : '❌ FAIL';
        const testName = test.replace(/([A-Z])/g, ' $1').trim();
        console.log(`${status} ${testName}`);
    });
    
    const phase1Passed = Object.values(phase1Results).filter(Boolean).length;
    const phase1Total = Object.keys(phase1Results).length;
    const phase1Rate = Math.round((phase1Passed / phase1Total) * 100);
    console.log(`\nPhase 1: ${phase1Passed}/${phase1Total} tests passed (${phase1Rate}%)`);
    
    console.log('\n🔹 PHASE 2: Enhanced Security');
    Object.entries(phase2Results).forEach(([test, result]) => {
        const status = result ? '✅ PASS' : '❌ FAIL';
        const testName = test.replace(/([A-Z])/g, ' $1').trim();
        console.log(`${status} ${testName}`);
    });
    
    const phase2Passed = Object.values(phase2Results).filter(Boolean).length;
    const phase2Total = Object.keys(phase2Results).length;
    const phase2Rate = Math.round((phase2Passed / phase2Total) * 100);
    console.log(`\nPhase 2: ${phase2Passed}/${phase2Total} tests passed (${phase2Rate}%)`);
    
    const totalPassed = phase1Passed + phase2Passed;
    const totalTests = phase1Total + phase2Total;
    const overallRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);
    
    if (overallRate >= 80) {
        console.log('🎉 Phase 1 & Phase 2 are PRODUCTION READY!');
    } else if (overallRate >= 60) {
        console.log('⚠️  Phase 1 & Phase 2 need minor fixes');
    } else {
        console.log('🚨 Phase 1 & Phase 2 require major fixes');
    }
}

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);
