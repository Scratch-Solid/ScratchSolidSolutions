import { test, expect } from '@playwright/test';

const isProd = (process.env.PORTAL_URL || '').includes('scratchsolidsolutions.org');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;

test.describe('End-to-End Public Page Flow', () => {
  test('Key onboarding pages render without errors', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    // Cleaner signup page
    await page.goto('/signup/cleaner', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    const body1 = await page.locator('body').innerText();
    expect(body1).not.toContain('Internal Server Error');
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2, { timeout: PAGE_TIMEOUT });

    // Create profile page
    await page.goto('/auth/create-profile', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    const body2 = await page.locator('body').innerText();
    expect(body2).not.toContain('Internal Server Error');
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Sign contract page (requires auth, redirects to login)
    await page.goto('/auth/sign-contract', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page).toHaveURL(/\/(auth\/)?login/, { timeout: PAGE_TIMEOUT });
  });
});
