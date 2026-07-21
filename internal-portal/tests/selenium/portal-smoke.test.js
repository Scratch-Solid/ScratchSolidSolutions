/**
 * Portal Smoke Test — Selenium WebDriver
 * Tests key pages and API endpoints for 500 errors, console errors,
 and runtime issues that would break in the Hetzner/PostgreSQL environment.
 *
 * Run: node tests/selenium/portal-smoke.test.js
 * Requires: npm install selenium-webdriver chromedriver
 */

const { Builder, By, until } = require('selenium-webdriver');
// Edge, not Chrome - no Chrome binary is installed in the environments
// these tests actually run in; Edge (Chromium-based) is what's available.
const edge = require('selenium-webdriver/edge');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000;

const consoleErrors = [];
const networkErrors = [];

async function createDriver() {
  const options = new edge.Options();
  options.addArguments('--headless');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1280,720');

  return new Builder()
    .forBrowser('MicrosoftEdge')
    .setEdgeOptions(options)
    .build();
}

async function collectConsoleLogs(driver) {
  try {
    const logs = await driver.manage().logs().get('browser');
    for (const entry of logs) {
      if (entry.level.name === 'SEVERE') {
        consoleErrors.push({ message: entry.message, level: entry.level.name });
      }
    }
  } catch (e) {
    // Console logging may not be available in all Chrome versions
  }
}

async function testPage(driver, path, expectedTitleFragment) {
  const url = `${BASE_URL}${path}`;
  console.log(`\nTesting: ${url}`);
  try {
    await driver.get(url);
    await driver.wait(until.elementLocated(By.css('body')), TIMEOUT);

    const title = await driver.getTitle();
    const pageSource = await driver.getPageSource();

    // Check for 500 errors rendered in page
    const has500 = pageSource.includes('Internal Server Error') ||
                   pageSource.includes('500') && pageSource.includes('Error');
    const has404 = pageSource.includes('404') && pageSource.includes('Not Found');

    await collectConsoleLogs(driver);

    if (has500) {
      networkErrors.push({ path, error: '500 Internal Server Error rendered in page' });
      console.log(`  FAIL: 500 error on ${path}`);
      return false;
    }
    if (has404 && expectedTitleFragment) {
      // 404 on pages that should exist is an error
      networkErrors.push({ path, error: '404 Not Found' });
      console.log(`  FAIL: 404 on ${path}`);
      return false;
    }

    console.log(`  OK: title="${title}"`);
    return true;
  } catch (err) {
    networkErrors.push({ path, error: err.message });
    console.log(`  FAIL: ${err.message}`);
    return false;
  }
}

async function testApiEndpoint(path) {
  const url = `${BASE_URL}${path}`;
  console.log(`\nTesting API: ${url}`);
  try {
    const response = await fetch(url);
    const status = response.status;
    let body = '';
    try { body = await response.text(); } catch {}

    if (status >= 500) {
      networkErrors.push({ path, error: `HTTP ${status}` });
      console.log(`  FAIL: HTTP ${status}`);
      // Print first 200 chars of error response for debugging
      console.log(`  Response preview: ${body.slice(0, 200)}`);
      return false;
    }

    console.log(`  OK: HTTP ${status}`);
    return true;
  } catch (err) {
    networkErrors.push({ path, error: err.message });
    console.log(`  FAIL: ${err.message}`);
    return false;
  }
}

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ScratchSolid Internal Portal — Smoke Test');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log('═══════════════════════════════════════════════════════════════');

  let driver;
  try {
    driver = await createDriver();
  } catch (err) {
    console.error('Failed to create WebDriver:', err.message);
    console.error('Make sure Chrome is installed and chromedriver is compatible.');
    process.exit(1);
  }

  const results = { passed: 0, failed: 0 };

  // ─── Static / Public Pages ───
  const publicPages = [
    { path: '/', title: '' },
    { path: '/auth/login', title: '' },
    { path: '/auth/signup', title: '' },
    { path: '/auth/forgot-password', title: '' },
    { path: '/auth/verify-email', title: '' },
  ];

  for (const page of publicPages) {
    const ok = await testPage(driver, page.path, page.title);
    ok ? results.passed++ : results.failed++;
  }

  // ─── API Health Checks ───
  const apiEndpoints = [
    '/api/health',
    '/api/ping',
    '/api/status',
  ];

  for (const endpoint of apiEndpoints) {
    const ok = await testApiEndpoint(endpoint);
    ok ? results.passed++ : results.failed++;
  }

  // ─── API Routes that hit the database (PostgreSQL compatibility test) ───
  const dbApiEndpoints = [
    '/api/auth/csrf-token',
    '/api/services',
    '/api/settings',
    '/api/employees',
    '/api/pending-contracts',
    '/api/bookings',
    '/api/cleaner-profile',
    '/api/checklist',
    '/api/promo-codes',
    '/api/quote',
    '/api/admin/health-report',
    '/api/admin/bookings',
    '/api/admin/cleaners',
    '/api/admin/users',
    '/api/admin/onboarding/analytics',
    '/api/admin/training/completion-rate',
    '/api/analytics',
    '/api/analytics/bookings',
    '/api/analytics/revenue',
  ];

  for (const endpoint of dbApiEndpoints) {
    const ok = await testApiEndpoint(endpoint);
    ok ? results.passed++ : results.failed++;
  }

  await driver.quit();

  // ─── Summary ───
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);

  if (consoleErrors.length > 0) {
    console.log('\n  Console Errors:');
    for (const err of consoleErrors.slice(0, 20)) {
      console.log(`    ${err.level}: ${err.message.slice(0, 150)}`);
    }
  }

  if (networkErrors.length > 0) {
    console.log('\n  Network / Runtime Errors:');
    for (const err of networkErrors) {
      console.log(`    ${err.path}: ${err.error}`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(results.failed > 0 ? 1 : 0);
})();
