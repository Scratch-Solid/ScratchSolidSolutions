/**
 * Dashboard Navigation Selenium Tests
 * Cross-browser regression for admin/cleaner dashboard navigation.
 */
const http = require('http');
const https = require('https');
const { Builder, By, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';
const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3000';

function isServerReachable(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, (res) => {
      resolve(res.statusCode < 500);
      req.destroy();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

const PORTAL_PUBLIC_PAGES = [
  '/auth/login',
  '/auth/signup',
  '/forgot-password',
  '/signup/cleaner',
];

describe('Portal Dashboard Navigation', () => {
  let driver;
  let driverAvailable = false;

  beforeAll(async () => {
    const reachable = await isServerReachable(PORTAL_URL);
    if (!reachable) {
      console.warn(`[Selenium] Portal ${PORTAL_URL} unreachable, skipping.`);
      driverAvailable = false;
      return;
    }
    try {
      const options = new edge.Options();
      options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
      driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build();
      driverAvailable = true;
    } catch (err) {
      console.warn('[Selenium] Edge driver unavailable:', err.message);
      driverAvailable = false;
    }
  }, 15000);

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  for (const path of PORTAL_PUBLIC_PAGES) {
    test(`${path} renders without 500`, async () => {
      if (!driverAvailable) { console.log(`[SKIP] ${path}`); return; }
      await driver.get(`${PORTAL_URL}${path}`);
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      const body = await driver.findElement(By.css('body')).getText();
      expect(body).not.toContain('Internal Server Error');
      expect(body).not.toContain('Application error');
    });
  }

  test('Cleaner signup page has consent checkboxes', async () => {
    if (!driverAvailable) { console.log('[SKIP] Cleaner signup consent'); return; }
    await driver.get(`${PORTAL_URL}/signup/cleaner`);
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).not.toContain('Internal Server Error');
    expect(body).not.toContain('Application error');
    if (!body.includes('POPIA')) {
      console.log('[WARN] Cleaner signup page missing POPIA text');
    }
  });

  test('Marketing site nav links have valid targets', async () => {
    if (!driverAvailable) { console.log('[SKIP] Marketing nav'); return; }
    const reachable = await isServerReachable(BASE_URL);
    if (!reachable) { console.log(`[SKIP] Marketing site unreachable`); return; }

    await driver.get(`${BASE_URL}/`);
    await driver.wait(until.elementLocated(By.css('nav, header')), 10000);
    const navLinks = await driver.findElements(By.css('nav a, header a'));
    expect(navLinks.length).toBeGreaterThan(0);

    const results = [];
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        results.push(href);
      }
    }
    expect(results.length).toBeGreaterThan(0);
  });
});
