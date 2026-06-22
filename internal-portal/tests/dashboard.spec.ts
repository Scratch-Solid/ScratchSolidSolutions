import { test, expect } from '@playwright/test';

const isProd = (process.env.PORTAL_URL || '').includes('scratchsolidsolutions.org');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;

test.describe('Admin Dashboard Tests', () => {
  test('Pipeline page loads with applicants', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto('/admin/onboarding/pipeline', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('text=Onboarding Pipeline')).toBeVisible();
  });

  test('Analytics page displays funnel data', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto('/admin/onboarding/analytics', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('text=Onboarding Analytics')).toBeVisible();
  });

  test('Monitoring page shows health status', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto('/admin/monitoring', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('text=System Health')).toBeVisible();
  });
});
