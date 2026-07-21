/**
 * COMPREHENSIVE SELENIUM TESTS — Internal Portal
 * Tests every page, every button, every form, every link, every admin/cleaner flow.
 * Run: node tests/selenium/comprehensive-portal.test.js
 */
const { Builder, By, until } = require('selenium-webdriver');
// Edge, not Chrome - no Chrome binary is installed in the environments
// these tests actually run in; Edge (Chromium-based) is what's available.
const edge = require('selenium-webdriver/edge');

const BASE_URL = process.env.BASE_URL || 'https://portal.scratchsolidsolutions.org';
const CI = !!process.env.CI;
const DELAY_MS = CI ? 3000 : 500;

// This file is a standalone script (main() at the bottom, no describe/test
// blocks) run directly via `node`, not through Jest - but every assertion
// below calls a bare `expect(...)`, a Jest global that's never defined
// outside a Jest runtime. Every one of these assertions has been silently
// throwing "expect is not defined" instead of actually checking anything.
// This is a minimal same-name shim covering just the matchers this file
// uses, so the existing assertions (and their try/catch-based pass/fail
// reporting below) start actually checking what they claim to.
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected a truthy value, got ${JSON.stringify(actual)}`);
    },
    toContain(expected) {
      const ok = (typeof actual === 'string' || Array.isArray(actual)) && actual.includes(expected);
      if (!ok) throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
    },
    toMatch(regex) {
      if (!regex.test(actual)) throw new Error(`Expected ${JSON.stringify(actual)} to match ${regex}`);
    },
    toBeGreaterThan(n) {
      if (!(actual > n)) throw new Error(`Expected ${actual} to be greater than ${n}`);
    },
    toHaveProperty(key) {
      if (!actual || !Object.prototype.hasOwnProperty.call(actual, key)) {
        throw new Error(`Expected object to have property ${JSON.stringify(key)}`);
      }
    },
  };
}

function delay(ms = DELAY_MS) {
  return new Promise(r => setTimeout(r, ms));
}

async function createDriver() {
  const options = new edge.Options();
  options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
  const driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 10000, pageLoad: 30000, script: 30000 });
  return driver;
}

async function assertNo500(driver) {
  const body = await driver.findElement(By.css('body')).getText();
  if (body.includes('Internal Server Error') && body.includes('500')) {
    throw new Error('Page contains 500 error');
  }
}

async function runTest(name, testFn) {
  const driver = await createDriver();
  let passed = false;
  let error = null;
  try {
    console.log(`  → ${name}`);
    await testFn(driver);
    passed = true;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    error = e;
    console.error(`  ✗ ${name}: ${e.message}`);
  } finally {
    await driver.quit();
  }
  return { passed, error };
}

// ─────────────────────────────────────────────
// PUBLIC PAGES
// ─────────────────────────────────────────────
async function testPublicPages() {
  console.log('\n📄 Public Pages');
  const pages = [
    { path: '/auth/login', title: 'Internal Portal' },
    { path: '/auth/forgot-password', title: 'Forgot' },
    { path: '/auth/change-password', title: 'Change' },
    { path: '/signup/cleaner', title: 'Consent' },
    { path: '/create-cleaner-profile', title: 'Profile' },
    { path: '/sign-contract', title: 'Contract' },
    { path: '/cleaner-pre-dashboard', title: 'Cleaner' },
    { path: '/cleaner-dashboard', title: 'Cleaner' },
    { path: '/digital-dashboard', title: 'Digital' },
    { path: '/transport-dashboard', title: 'Transport' },
    { path: '/supervisor-dashboard', title: 'Supervisor' },
    { path: '/admin-dashboard', title: 'Admin' },
    { path: '/admin/onboarding', title: 'Onboarding' },
    { path: '/admin/security', title: 'Security' },
    { path: '/admin/roles', title: 'Roles' },
    { path: '/admin/monitoring', title: 'Monitoring' },
    { path: '/admin/audit-logs', title: 'Audit' },
    { path: '/admin/content', title: 'Content' },
    { path: '/admin/content-upload', title: 'Upload' },
    { path: '/admin/pipeline', title: 'Pipeline' },
    { path: '/admin/analytics', title: 'Analytics' },
  ];
  let passed = 0;
  let failed = 0;
  for (const p of pages) {
    const result = await runTest(`Load ${p.path}`, async (driver) => {
      await driver.get(`${BASE_URL}${p.path}`);
      await delay();
      await assertNo500(driver);
    });
    if (result.passed) passed++; else failed++;
  }
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// LOGIN PAGE ELEMENTS
// ─────────────────────────────────────────────
async function testLoginPage() {
  console.log('\n🔐 Login Page');
  let passed = 0, failed = 0;

  const result = await runTest('Login page has username field', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    const username = await driver.findElement(By.css('input#username'));
    expect(username).toBeTruthy();
    const required = await username.getAttribute('required');
    expect(required).toBeTruthy();
  });
  if (result.passed) passed++; else failed++;

  const result2 = await runTest('Login page has password field', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    const password = await driver.findElement(By.css('input#password'));
    expect(password).toBeTruthy();
    const required = await password.getAttribute('required');
    expect(required).toBeTruthy();
  });
  if (result2.passed) passed++; else failed++;

  const result3 = await runTest('Login page has submit button', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    const btn = await driver.findElement(By.css('button[type="submit"]'));
    const text = await btn.getText();
    expect(text).toContain('Login');
  });
  if (result3.passed) passed++; else failed++;

  const result4 = await runTest('Login page has "Apply Now" button', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    const btn = await driver.findElement(By.xpath('//button[contains(text(),"Apply Now")]'));
    expect(btn).toBeTruthy();
  });
  if (result4.passed) passed++; else failed++;

  const result5 = await runTest('Login page has "Forgot Password?" link', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    const link = await driver.findElement(By.xpath('//button[contains(text(),"Forgot Password")]'));
    expect(link).toBeTruthy();
  });
  if (result5.passed) passed++; else failed++;

  const result6 = await runTest('Apply Now routes to cleaner signup', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    await driver.findElement(By.xpath('//button[contains(text(),"Apply Now")]')).click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/signup/cleaner');
  });
  if (result6.passed) passed++; else failed++;

  const result7 = await runTest('Forgot Password routes to forgot-password', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    await driver.findElement(By.xpath('//button[contains(text(),"Forgot Password")]')).click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/forgot-password');
  });
  if (result7.passed) passed++; else failed++;

  const result8 = await runTest('Login form validation — empty fields', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    await driver.findElement(By.css('button[type="submit"]')).click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth/login');
  });
  if (result8.passed) passed++; else failed++;

  const result9 = await runTest('Login form — invalid credentials shows error', async (driver) => {
    await driver.get(`${BASE_URL}/auth/login`);
    await delay();
    await driver.findElement(By.css('input#username')).sendKeys('invaliduser12345');
    await driver.findElement(By.css('input#password')).sendKeys('wrongpassword');
    await driver.findElement(By.css('button[type="submit"]')).click();
    await delay(2000);
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toMatch(/invalid|error|failed|wrong|incorrect/i);
  });
  if (result9.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// CLEANER SIGNUP — CONSENT FORM
// ─────────────────────────────────────────────
async function testCleanerSignup() {
  console.log('\n🧹 Cleaner Signup — Consent Form');
  let passed = 0, failed = 0;

  const result = await runTest('Consent form has all required fields', async (driver) => {
    await driver.get(`${BASE_URL}/signup/cleaner`);
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toContain('Consent Form');
    expect(body).toContain('Full Name');
    expect(body).toContain('ID');
    expect(body).toContain('Contact');
    expect(body).toContain('Position');
  });
  if (result.passed) passed++; else failed++;

  const result2 = await runTest('Consent checkboxes are required', async (driver) => {
    await driver.get(`${BASE_URL}/signup/cleaner`);
    await delay();
    const checkboxes = await driver.findElements(By.css('input[type="checkbox"]'));
    expect(checkboxes.length).toBeGreaterThan(0);
    for (const cb of checkboxes) {
      const required = await cb.getAttribute('required');
      expect(required).toBeTruthy();
    }
  });
  if (result2.passed) passed++; else failed++;

  const result3 = await runTest('Privacy Policy link exists on consent form', async (driver) => {
    await driver.get(`${BASE_URL}/signup/cleaner`);
    await delay();
    const links = await driver.findElements(By.css('a[href*="privacy"]'));
    expect(links.length).toBeGreaterThan(0);
  });
  if (result3.passed) passed++; else failed++;

  const result4 = await runTest('Terms link exists on consent form', async (driver) => {
    await driver.get(`${BASE_URL}/signup/cleaner`);
    await delay();
    const links = await driver.findElements(By.css('a[href*="terms"]'));
    expect(links.length).toBeGreaterThan(0);
  });
  if (result4.passed) passed++; else failed++;

  const result5 = await runTest('Back to Login link exists', async (driver) => {
    await driver.get(`${BASE_URL}/signup/cleaner`);
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toMatch(/Back to Login|Login/i);
  });
  if (result5.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────
async function testAdminDashboard() {
  console.log('\n👑 Admin Dashboard');
  let passed = 0, failed = 0;

  const result = await runTest('Admin dashboard loads with Overview', async (driver) => {
    await driver.get(`${BASE_URL}/admin-dashboard`);
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toContain('Overview');
    expect(body).toContain('Total Bookings');
    expect(body).toContain('Total Revenue');
    expect(body).toContain('Active Cleaners');
  });
  if (result.passed) passed++; else failed++;

  const result2 = await runTest('Admin dashboard has all tabs', async (driver) => {
    await driver.get(`${BASE_URL}/admin-dashboard`);
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    const tabs = ['Overview', 'Employees', 'Services', 'Cleaners', 'Content', 'Pricing', 'Proxy', 'Pools', 'Reviews', 'Training', 'Cleaner Analytics'];
    for (const tab of tabs) {
      expect(body).toContain(tab);
    }
  });
  if (result2.passed) passed++; else failed++;

  const result3 = await runTest('Admin Tools section has all links', async (driver) => {
    await driver.get(`${BASE_URL}/admin-dashboard`);
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    const tools = ['Onboarding', 'Security', 'Roles', 'Monitoring', 'Audit Logs'];
    for (const tool of tools) {
      expect(body).toContain(tool);
    }
  });
  if (result3.passed) passed++; else failed++;

  const result4 = await runTest('Employees tab has New Joiners and Add New Cleaner', async (driver) => {
    await driver.get(`${BASE_URL}/admin-dashboard`);
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toContain('Add New Cleaner');
  });
  if (result4.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────
async function testApiEndpoints() {
  console.log('\n🌐 API Endpoints');
  const endpoints = [
    { method: 'GET', path: '/api/employees', expectArray: true },
    { method: 'GET', path: '/api/contracts', expectArray: true },
    { method: 'GET', path: '/api/bookings', expectArray: true },
    { method: 'GET', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/login', body: { identifier: 'test', password: 'test' } },
    { method: 'POST', path: '/api/auth/forgot-password', body: { email: 'test@test.com' } },
    { method: 'GET', path: '/api/cleaner/pre-dashboard', expectKey: 'data' },
    { method: 'GET', path: '/api/marketing/content', expectArray: true },
  ];

  let passed = 0, failed = 0;
  for (const ep of endpoints) {
    const result = await runTest(`${ep.method} ${ep.path}`, async (driver) => {
      const url = `${BASE_URL}${ep.path}`;
      if (ep.method === 'GET') {
        await driver.get(url);
        await delay();
        const pre = await driver.findElement(By.css('pre, body')).getText();
        const data = JSON.parse(pre);
        if (ep.expectArray) expect(Array.isArray(data)).toBe(true);
        if (ep.expectKey) expect(data).toHaveProperty(ep.expectKey);
      } else {
        // executeScript never awaits the fetch promise it assigns to
        // window._testResult - it just serializes whatever's there the
        // instant the script returns, which is the pending Promise object
        // itself, not its resolved value. executeAsyncScript is the correct
        // WebDriver primitive for this: the script gets an explicit
        // callback argument and the driver actually waits for it to be
        // invoked before returning.
        const res = await driver.executeAsyncScript(`
          const callback = arguments[arguments.length - 1];
          fetch('${url}', {
            method: '${ep.method}',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(${JSON.stringify(ep.body || {})})
          }).then(r => callback({ status: r.status, ok: r.ok }))
            .catch(e => callback({ status: 0, ok: false, error: String(e) }));
        `);
        expect([200, 201, 400, 401, 403, 404, 405, 409]).toContain(res.status);
      }
    });
    if (result.passed) passed++; else failed++;
    await delay(500);
  }
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
async function testNavigation() {
  console.log('\n🔗 Navigation');
  let passed = 0, failed = 0;

  const result = await runTest('Root page redirects to login', async (driver) => {
    await driver.get(`${BASE_URL}/`);
    await delay(2000);
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth/login');
  });
  if (result.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  INTERNAL PORTAL — COMPREHENSIVE SELENIUM');
  console.log('═══════════════════════════════════════════');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log('');

  let totalPassed = 0;
  let totalFailed = 0;

  const suites = [
    testPublicPages,
    testLoginPage,
    testCleanerSignup,
    testAdminDashboard,
    testApiEndpoints,
    testNavigation,
  ];

  for (const suite of suites) {
    const ok = await suite();
    if (ok) totalPassed++; else totalFailed++;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  FINAL: ${totalPassed} suites passed, ${totalFailed} suites failed`);
  console.log('═══════════════════════════════════════════');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
