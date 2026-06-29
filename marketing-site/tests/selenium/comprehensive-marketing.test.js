/**
 * COMPREHENSIVE SELENIUM TESTS — Marketing Site
 * Tests every page, every button, every link, every form, every API endpoint.
 * Run: node tests/selenium/comprehensive-marketing.test.js
 */
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';
const CI = !!process.env.CI;
const DELAY_MS = CI ? 3000 : 500;

function delay(ms = DELAY_MS) {
  return new Promise(r => setTimeout(r, ms));
}

async function createDriver() {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
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
    { path: '/', title: 'Spotless' },
    { path: '/services', title: 'Services' },
    { path: '/about', title: 'About' },
    { path: '/gallery', title: 'Gallery' },
    { path: '/contact', title: 'Contact' },
    { path: '/privacy', title: 'Privacy' },
    { path: '/privacy-policy', title: 'Privacy' },
    { path: '/terms', title: 'Terms' },
    { path: '/auth', title: 'Sign In' },
    { path: '/login', title: 'Sign In' },
    { path: '/forgot-password', title: 'Forgot' },
    { path: '/booking', title: 'Sign In' },
    { path: '/business-booking', title: 'Sign In' },
    { path: '/business-events', title: 'Events' },
    { path: '/business-signup', title: 'Business' },
    { path: '/client-signup', title: 'Sign Up' },
    { path: '/reset-password?token=test', title: 'Reset' },
  ];
  let passed = 0;
  let failed = 0;
  for (const p of pages) {
    const result = await runTest(`Load ${p.path}`, async (driver) => {
      if (p.path === '/gallery') {
        await driver.manage().setTimeouts({ pageLoad: 60000 });
      }
      await driver.get(`${BASE_URL}${p.path}`);
      await delay();
      await assertNo500(driver);
      const title = await driver.getTitle();
      expect(title).toContain(p.title);
    });
    if (result.passed) passed++; else failed++;
  }
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// NAVIGATION — All links
// ─────────────────────────────────────────────
async function testNavigation() {
  console.log('\n🔗 Navigation Links');
  let passed = 0, failed = 0;

  const result = await runTest('Click Services link from homepage', async (driver) => {
    await driver.get(`${BASE_URL}/`);
    await delay();
    await driver.findElement(By.css('a[href="/services"]')).click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/services');
    const heading = await driver.findElement(By.css('h1')).getText();
    expect(heading).toContain('Our Services');
  });
  if (result.passed) passed++; else failed++;

  const result2 = await runTest('Click About link from homepage', async (driver) => {
    await driver.get(`${BASE_URL}/`);
    await delay();
    await driver.findElement(By.css('a[href="/about"]')).click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/about');
  });
  if (result2.passed) passed++; else failed++;

  const result3 = await runTest('Overlay menu opens and privacy link works', async (driver) => {
    await driver.get(`${BASE_URL}/`);
    await delay();
    await driver.findElement(By.css('button[aria-label="Open menu"]')).click();
    await delay();
    await driver.findElement(By.css('a[href="/privacy"]')).click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/privacy');
  });
  if (result3.passed) passed++; else failed++;

  const result4 = await runTest('Auth page Sign Up toggle works', async (driver) => {
    await driver.get(`${BASE_URL}/auth`);
    await delay();
    await driver.findElement(By.xpath('//text()[contains(.,"Sign Up")]')).click();
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toContain('Create Account');
  });
  if (result4.passed) passed++; else failed++;

  const result5 = await runTest('Auth page Individual/Business tabs work', async (driver) => {
    await driver.get(`${BASE_URL}/auth`);
    await delay();
    await driver.findElement(By.xpath('//text()[contains(.,"Business")]')).click();
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toContain('Business Name');
    await driver.findElement(By.xpath('//text()[contains(.,"Individual")]')).click();
    await delay();
    const body2 = await driver.findElement(By.css('body')).getText();
    expect(body2).toContain('Full Name');
  });
  if (result5.passed) passed++; else failed++;

  const result6 = await runTest('Forgot password link works', async (driver) => {
    await driver.get(`${BASE_URL}/auth`);
    await delay();
    await driver.findElement(By.xpath('//text()[contains(.,"Forgot Password")]')).click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/forgot-password');
  });
  if (result6.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// AUTH FORMS
// ─────────────────────────────────────────────
async function testAuthForms() {
  console.log('\n🔐 Auth Forms');
  let passed = 0, failed = 0;

  const result = await runTest('Login form validation — empty fields', async (driver) => {
    await driver.get(`${BASE_URL}/auth`);
    await delay();
    const submit = await driver.findElement(By.css('button[type="submit"]'));
    await submit.click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth');
  });
  if (result.passed) passed++; else failed++;

  const result2 = await runTest('Login form — invalid credentials', async (driver) => {
    await driver.get(`${BASE_URL}/auth`);
    await delay();
    await driver.findElement(By.css('input[name="phone"], input[name="identifier"], input[name="email"]')).sendKeys('0000000000');
    await driver.findElement(By.css('input[name="password"]')).sendKeys('wrongpassword');
    await driver.findElement(By.css('button[type="submit"]')).click();
    await delay(2000);
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toMatch(/invalid|error|failed|wrong/i);
  });
  if (result2.passed) passed++; else failed++;

  const result3 = await runTest('Consent checkbox exists on signup', async (driver) => {
    await driver.get(`${BASE_URL}/auth`);
    await delay();
    await driver.findElement(By.xpath('//text()[contains(.,"Sign Up")]')).click();
    await delay();
    const consent = await driver.findElement(By.css('input#consent'));
    expect(consent).toBeTruthy();
    const required = await consent.getAttribute('required');
    expect(required).toBeTruthy();
  });
  if (result3.passed) passed++; else failed++;

  const result4 = await runTest('Privacy Policy and Terms links visible on signup', async (driver) => {
    await driver.get(`${BASE_URL}/auth`);
    await delay();
    await driver.findElement(By.xpath('//text()[contains(.,"Sign Up")]')).click();
    await delay();
    const privacyLink = await driver.findElement(By.css('a[href="/privacy"]'));
    expect(privacyLink).toBeTruthy();
    const termsLink = await driver.findElement(By.css('a[href="/terms"]'));
    expect(termsLink).toBeTruthy();
  });
  if (result4.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// BOOKING FORM — Auth-guarded redirects
// ─────────────────────────────────────────────
async function testBookingForm() {
  console.log('\n📅 Booking Form');
  let passed = 0, failed = 0;

  const result = await runTest('/book redirects unauthenticated to auth', async (driver) => {
    await driver.get(`${BASE_URL}/book`);
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth');
  });
  if (result.passed) passed++; else failed++;

  const result2 = await runTest('/business-booking redirects unauthenticated to auth', async (driver) => {
    await driver.get(`${BASE_URL}/business-booking`);
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth');
  });
  if (result2.passed) passed++; else failed++;

  const result3 = await runTest('/client-dashboard redirects unauthenticated to auth', async (driver) => {
    await driver.get(`${BASE_URL}/client-dashboard`);
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth');
  });
  if (result3.passed) passed++; else failed++;

  const result4 = await runTest('Homepage "Get a Quick Quote" routes to auth when not logged in', async (driver) => {
    await driver.get(`${BASE_URL}/`);
    await delay();
    const btn = await driver.findElement(By.xpath('//button[contains(text(),"Get a Quick Quote")]'));
    await btn.click();
    await delay();
    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth');
  });
  if (result4.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// SERVICE CARDS
// ─────────────────────────────────────────────
async function testServiceCards() {
  console.log('\n🃏 Service Cards');
  let passed = 0, failed = 0;

  const result = await runTest('Services page has flip cards', async (driver) => {
    await driver.get(`${BASE_URL}/services`);
    await delay();
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).toContain('Maintenance Clean');
    expect(body).toContain('Deep Clean');
    expect(body).toContain('Request a Quote');
  });
  if (result.passed) passed++; else failed++;

  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────
async function testApiEndpoints() {
  console.log('\n🌐 API Endpoints');
  const endpoints = [
    { method: 'GET', path: '/api/services', expectArray: true },
    { method: 'GET', path: '/api/service-pricing', expectArray: true },
    { method: 'GET', path: '/api/pricing', expectArray: true },
    { method: 'GET', path: '/api/content', expectArray: true },
    { method: 'GET', path: '/api/content/list', expectArray: true },
    { method: 'GET', path: '/api/cleaners', expectArray: true },
    { method: 'GET', path: '/api/feedback', expectArray: true },
    { method: 'GET', path: '/api/bookings', expectArray: true },
    { method: 'GET', path: '/api/contracts', expectArray: true },
    { method: 'GET', path: '/api/employees', expectArray: true },
    { method: 'GET', path: '/api/cleaner-profiles', expectArray: true },
    { method: 'GET', path: '/api/business-events', expectArray: true },
    { method: 'GET', path: '/api/background-images', expectArray: true },
    { method: 'GET', path: '/api/audit-logs', expectArray: true },
    { method: 'GET', path: '/api/customer/quotes', expectArray: true },
    { method: 'POST', path: '/api/chatbot', body: { message: 'hello' }, expectKey: 'response' },
    { method: 'POST', path: '/api/analytics/track', body: { event: 'test', page: '/test' } },
  ];

  let passed = 0, failed = 0;
  for (const ep of endpoints) {
    const result = await runTest(`${ep.method} ${ep.path}`, async (driver) => {
      const url = `${BASE_URL}${ep.path}`;
      let res;
      if (ep.method === 'GET') {
        await driver.get(url);
      } else {
        await driver.executeScript(`
          window._testResult = fetch('${url}', {
            method: '${ep.method}',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(${JSON.stringify(ep.body || {})})
          }).then(r => ({ status: r.status, ok: r.ok }));
        `);
        await delay(2000);
        res = await driver.executeScript('return window._testResult;');
      }
      if (ep.method === 'GET') {
        const body = await driver.findElement(By.css('pre')).getText().catch(() => driver.findElement(By.css('body')).getText());
        const data = JSON.parse(body);
        if (ep.expectArray) expect(Array.isArray(data)).toBe(true);
        if (ep.expectKey) expect(data).toHaveProperty(ep.expectKey);
      }
    });
    if (result.passed) passed++; else failed++;
    await delay(500);
  }
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// SEO
// ─────────────────────────────────────────────
async function testSeo() {
  console.log('\n📢 SEO');
  let passed = 0, failed = 0;
  const pages = ['/', '/services', '/about', '/gallery', '/contact', '/privacy', '/terms', '/auth'];
  for (const path of pages) {
    const result = await runTest(`Title on ${path}`, async (driver) => {
      await driver.get(`${BASE_URL}${path}`);
      await delay();
      const title = await driver.getTitle();
      expect(title.length).toBeGreaterThan(0);
    });
    if (result.passed) passed++; else failed++;
  }
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
// Jest wrapper for the comprehensive Selenium tests
describe('Comprehensive Marketing Site — Selenium', () => {
  test('All page suites pass', async () => {
    console.log('═══════════════════════════════════════════');
    console.log('  MARKETING SITE — COMPREHENSIVE SELENIUM');
    console.log('═══════════════════════════════════════════');
    console.log(`  Base URL: ${BASE_URL}`);
    console.log('');

    let totalPassed = 0;
    let totalFailed = 0;

    const suites = [
      testPublicPages,
      testNavigation,
      testAuthForms,
      testBookingForm,
      testServiceCards,
      testApiEndpoints,
      testSeo,
    ];

    for (const suite of suites) {
      const ok = await suite();
      if (ok) totalPassed++; else totalFailed++;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`  FINAL: ${totalPassed} suites passed, ${totalFailed} suites failed`);
    console.log('═══════════════════════════════════════════');

    expect(totalFailed).toBe(0);
  }, 600000);
});
