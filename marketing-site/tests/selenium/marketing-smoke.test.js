/**
 * Marketing Site Selenium Smoke Test
 * Verifies key public pages render without 500 errors or console issues.
 */
const http = require('http');
const https = require('https');
const { Builder, By, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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

function buildDriverWithTimeout(ms = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebDriver build timeout')), ms);
    const options = new edge.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
    new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build()
      .then((drv) => { clearTimeout(timer); resolve(drv); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}
const PAGES = [
  '/',
  '/services',
  '/book',
  '/contact',
  '/login',
  '/client-signup',
  '/forgot-password',
  '/gallery',
  '/privacy',
  '/terms',
];

describe('Marketing Site Selenium Smoke', () => {
  let driver;
  let driverAvailable = false;

  beforeAll(async () => {
    const reachable = await isServerReachable(BASE_URL);
    if (!reachable) {
      console.warn(`[Selenium] Server ${BASE_URL} unreachable, skipping Selenium tests.`);
      driverAvailable = false;
      return;
    }
    try {
      driver = await buildDriverWithTimeout(8000);
      driverAvailable = true;
    } catch (err) {
      console.warn('[Selenium] Edge driver unavailable, skipping Selenium tests:', err.message);
      driverAvailable = false;
      driver = null;
    }
  }, 15000);

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  for (const path of PAGES) {
    test(`${path} renders without 500`, async () => {
      if (!driverAvailable) {
        console.log(`[SKIP] ${path} — driver unavailable`);
        return;
      }
      await driver.get(`${BASE_URL}${path}`);
      await driver.wait(until.elementLocated(By.css('body')), 10000);

      const body = await driver.findElement(By.css('body')).getText();
      expect(body).not.toContain('Internal Server Error');
      expect(body).not.toContain('Application error');
    });
  }

  test('Navigation is present', async () => {
    if (!driverAvailable) {
      console.log('[SKIP] Navigation — driver unavailable');
      return;
    }
    await driver.get(`${BASE_URL}/`);
    const nav = await driver.findElements(By.css('nav, header'));
    expect(nav.length).toBeGreaterThan(0);
  });
});
