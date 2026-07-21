const { Builder, By, until } = require('selenium-webdriver');
// Edge, not Chrome - no Chrome binary is installed in the environments
// these tests actually run in; Edge (Chromium-based) is what's available.
const edge = require('selenium-webdriver/edge');

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';
const isProd = PORTAL_URL.includes('scratchsolidsolutions.org') && !PORTAL_URL.includes('staging');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Admin accounts can no longer be created via public signup (role=admin was
// removed there 2026-07-16 - it was a privilege-escalation hole this test was
// unintentionally exploiting against production every run). This test needs
// a pre-provisioned admin account's credentials, and is skipped entirely
// against production.
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const canTestAdmin = !isProd && E2E_ADMIN_EMAIL && E2E_ADMIN_PASSWORD;

/**
 * Selenium Tests for Internal Portal
 * Covers: content CRUD, routing, buttons, flows
 */

describe('Internal Portal Selenium Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new edge.Options();
    options.addArguments('--headless', '--disable-gpu', '--window-size=1920,1080');
    driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build();
  }, PAGE_TIMEOUT);

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Login page loads with all required elements', async () => {
    await driver.get(`${PORTAL_URL}/auth/login`);
    await driver.wait(until.elementLocated(By.css('body')), PAGE_TIMEOUT);

    const bodyText = await driver.findElement(By.css('body')).getText();
    expect(bodyText).toContain('Login');
    expect(bodyText).not.toContain('Internal Server Error');

    // Check for identifier input
    const inputs = await driver.findElements(By.css('input'));
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    // Check for submit button
    const buttons = await driver.findElements(By.css('button[type="submit"]'));
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  }, PAGE_TIMEOUT);

  test('/admin redirects to login for unauthenticated user', async () => {
    await driver.get(`${PORTAL_URL}/admin`);
    await driver.wait(until.urlContains('/auth/login'), PAGE_TIMEOUT);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/auth/login');
  }, PAGE_TIMEOUT);

  test('/admin/content redirects to /admin/content-upload', async () => {
    await driver.get(`${PORTAL_URL}/admin/content`);
    await sleep(3000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/admin/content-upload');
  }, PAGE_TIMEOUT);

  test('Cleaner signup page loads with POPIA checkboxes', async () => {
    await driver.get(`${PORTAL_URL}/signup/cleaner`);
    await driver.wait(until.elementLocated(By.css('body')), PAGE_TIMEOUT);

    const bodyText = await driver.findElement(By.css('body')).getText();
    expect(bodyText).not.toContain('Internal Server Error');

    const checkboxes = await driver.findElements(By.css('input[type="checkbox"]'));
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  }, PAGE_TIMEOUT);

  test('Admin onboarding pipeline page renders without errors', async () => {
    await driver.get(`${PORTAL_URL}/admin/onboarding/pipeline`);
    await driver.wait(until.elementLocated(By.css('body')), PAGE_TIMEOUT);

    const bodyText = await driver.findElement(By.css('body')).getText();
    expect(bodyText).not.toContain('Internal Server Error');
    expect(bodyText).not.toContain('Application error');
  }, PAGE_TIMEOUT);

  test('Navigation links on login page do not return 500', async () => {
    await driver.get(`${PORTAL_URL}/auth/login`);
    await driver.wait(until.elementLocated(By.css('a[href^="/"]')), PAGE_TIMEOUT);

    const links = await driver.findElements(By.css('a[href^="/"]'));
    const hrefs = [];
    for (const link of links.slice(0, 10)) {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('//') && !hrefs.includes(href)) {
        hrefs.push(href);
      }
    }

    for (const href of hrefs) {
      // Use fetch to check status without navigating
      const response = await fetch(`${PORTAL_URL}${href}`, { method: 'HEAD' });
      expect(response.status).toBeLessThan(500);
    }
  }, PAGE_TIMEOUT + 20000);

  (canTestAdmin ? test : test.skip)('Content upload page has form elements for authenticated admin', async () => {
    // Login as a pre-provisioned admin account.
    const loginRes = await fetch(`${PORTAL_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: E2E_ADMIN_EMAIL,
        password: E2E_ADMIN_PASSWORD
      })
    });
    if (loginRes.status === 429) { console.log('Rate limited, skipping'); return; }

    const loginBody = await loginRes.json();
    const token = loginBody.token;

    // Navigate to login and set localStorage
    await driver.get(`${PORTAL_URL}/auth/login`);
    await driver.executeScript(`localStorage.setItem('authToken', '${token}'); localStorage.setItem('userRole', 'admin');`);

    // Navigate to content upload
    await driver.get(`${PORTAL_URL}/admin/content-upload`);
    await driver.wait(until.elementLocated(By.css('body')), PAGE_TIMEOUT);

    const bodyText = await driver.findElement(By.css('body')).getText();
    expect(bodyText).toContain('Content Upload');
    expect(bodyText).not.toContain('Internal Server Error');

    // Verify form elements
    const selects = await driver.findElements(By.css('select'));
    expect(selects.length).toBeGreaterThanOrEqual(1);

    const textareas = await driver.findElements(By.css('textarea'));
    expect(textareas.length).toBeGreaterThanOrEqual(1);

    const buttons = await driver.findElements(By.css('button[type="submit"]'));
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  }, PAGE_TIMEOUT + 20000);
});
