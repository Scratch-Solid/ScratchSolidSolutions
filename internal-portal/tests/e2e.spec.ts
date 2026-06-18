import { test, expect } from '@playwright/test';

test.describe('End-to-End Public Page Flow', () => {
  test('Key onboarding pages render without errors', async ({ page }) => {
    // Cleaner signup page
    await page.goto('/signup/cleaner');
    const body1 = await page.locator('body').innerText();
    expect(body1).not.toContain('Internal Server Error');
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2, { timeout: 5000 });

    // Create profile page
    await page.goto('/auth/create-profile');
    const body2 = await page.locator('body').innerText();
    expect(body2).not.toContain('Internal Server Error');
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Sign contract page (requires auth, redirects to login)
    await page.goto('/auth/sign-contract');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });
});
