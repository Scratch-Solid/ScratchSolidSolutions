import { test, expect } from '@playwright/test';

test.describe('End-to-End Complete Flow', () => {
  test('Complete onboarding flow from consent to active', async ({ page }) => {
    // Submit consent
    await page.goto('/auth/consent');
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('input[name="email"]', 'e2e@example.com');
    await page.fill('input[name="department"]', 'cleaning');
    await page.click('button[type="submit"]');
    
    // Create profile
    await page.waitForURL(/\/auth\/create-profile/);
    await page.fill('input[name="fullName"]', 'E2E Test User');
    await page.fill('input[name="address"]', '123 E2E St');
    await page.fill('input[name="idNumber"]', '1234567890123');
    await page.fill('input[name="bankAccount"]', '1234567890');
    await page.fill('input[name="bankName"]', 'E2E Bank');
    await page.click('button[type="submit"]');
    
    // Sign contract
    await page.waitForURL(/\/auth\/sign-contract/);
    await page.check('input[type="checkbox"][value="agree"]');
    await page.waitForTimeout(500);
    await page.check('input[type="checkbox"][value="sign"]');
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('text=Contract signed successfully')).toBeVisible();
  });
});
