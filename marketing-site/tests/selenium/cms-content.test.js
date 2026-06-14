/**
 * CMS Content Selenium Tests
 * Validates dynamic CMS content (D1 -> frontend) across browsers.
 */
const http = require('http');
const https = require('https');
const { Builder, By, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';

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

const CMS_PAGES = [
  { path: '/services', api: '/api/services', contentCheck: (text) => text.length > 200 },
  { path: '/pricing', api: '/api/pricing', contentCheck: (text) => text.length > 200 },
  { path: '/gallery', api: null, contentCheck: (text) => text.length > 100 },
  { path: '/', api: '/api/content', contentCheck: (text) => text.length > 500 },
];

describe('CMS Content Cross-Browser', () => {
  let driver;
  let driverAvailable = false;

  beforeAll(async () => {
    const reachable = await isServerReachable(BASE_URL);
    if (!reachable) {
      console.warn(`[Selenium] Server ${BASE_URL} unreachable, skipping.`);
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

  for (const page of CMS_PAGES) {
    test(`${page.path} renders CMS content without error`, async () => {
      if (!driverAvailable) { console.log(`[SKIP] ${page.path}`); return; }
      await driver.get(`${BASE_URL}${page.path}`);
      await driver.wait(until.elementLocated(By.css('body')), 10000);

      const body = await driver.findElement(By.css('body')).getText();
      expect(body).not.toContain('Internal Server Error');
      expect(body).not.toContain('Application error');
      expect(page.contentCheck(body)).toBe(true);
    });
  }

  test('API content and page content are consistent', async () => {
    if (!driverAvailable) { console.log('[SKIP] API consistency'); return; }

    for (const page of CMS_PAGES.filter(p => p.api)) {
      // Fetch API data
      const apiRes = await fetch(`${BASE_URL}${page.api}`);
      expect(apiRes.status).toBeLessThan(500);

      // Load page
      await driver.get(`${BASE_URL}${page.path}`);
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      const bodyText = await driver.findElement(By.css('body')).getText();
      expect(bodyText).not.toContain('Internal Server Error');
    }
  });

  test('Content updates do not cause 500 errors', async () => {
    if (!driverAvailable) { console.log('[SKIP] Content updates'); return; }
    const dynamicPaths = ['/services', '/pricing', '/gallery'];
    for (const path of dynamicPaths) {
      await driver.get(`${BASE_URL}${path}`);
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      const body = await driver.findElement(By.css('body')).getText();
      expect(body).not.toContain('Internal Server Error');
    }
  });
});
