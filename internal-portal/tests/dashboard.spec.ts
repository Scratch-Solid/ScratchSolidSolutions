import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Tests', () => {
  test('Pipeline page loads with applicants', async ({ page }) => {
    await page.goto('/admin/onboarding/pipeline');
    await expect(page.locator('text=Onboarding Pipeline')).toBeVisible();
  });

  test('Analytics page displays funnel data', async ({ page }) => {
    await page.goto('/admin/onboarding/analytics');
    await expect(page.locator('text=Onboarding Analytics')).toBeVisible();
  });

  test('Monitoring page shows health status', async ({ page }) => {
    await page.goto('/admin/monitoring');
    await expect(page.locator('text=System Health')).toBeVisible();
  });
});
