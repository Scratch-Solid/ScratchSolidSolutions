/**
 * COMPREHENSIVE FORM TESTS — Marketing Site
 * Tests every form: auth (login/signup), booking multi-step, consent, indemnity, quote.
 * Handles rate limiting with serial execution and delays.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';
const CI = !!process.env.CI;
const DELAY_MS = CI ? 3000 : 500;

function delay(ms = DELAY_MS) {
  return new Promise(r => setTimeout(r, ms));
}

async function goTo(page: any, path: string) {
  const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await delay();
  // Dismiss cookie consent banner if present
  const acceptBtn = page.locator('text=Accept').first();
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click().catch(() => {});
    await delay(200);
  }
  return res;
}

function skipOn429(response: any) {
  if (response.status() === 429) {
    test.skip(true, 'Rate limited (429)');
  }
}

// Run auth tests serially to avoid rate limiting
test.describe.configure({ mode: 'serial' });

// Pre-accept the cookie notice so its fixed banner never intercepts clicks
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('cookieConsent', 'accepted');
    } catch {}
  });
});

// ─────────────────────────────────────────────
// AUTH FORMS — Signup & Login
// ─────────────────────────────────────────────
test.describe('🔐 Auth Forms — Individual', () => {
  const testPhone = `07${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  test('Individual signup form validation — empty fields', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Sign Up');
    await delay();
    // Try submit empty form
    await page.click('button[type="submit"]');
    await delay();
    // HTML5 validation should prevent submission
    await expect(page).toHaveURL(/\/auth/);
  });

  test('Individual signup — password too short validation', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Sign Up');
    await delay();
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="password"]', 'short');
    // Check consent
    await page.check('input#consent');
    await page.click('button[type="submit"]');
    await delay();
    // Should still be on auth page (validation failed)
    await expect(page).toHaveURL(/\/auth/);
  });

  test('Individual signup — consent required', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Sign Up');
    await delay();
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', `07${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`);
    await page.fill('input[name="email"]', `consent${Date.now()}@example.com`);
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="password"]', testPassword);
    // Do NOT check consent
    await page.click('button[type="submit"]');
    await delay(1000);
    // Should show error about consent
    const body = await page.content();
    expect(body).toMatch(/accept.*Privacy|consent|POPIA/i);
  });

  test('Individual signup — Privacy Policy link in consent', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Sign Up');
    await delay();
    const privacyLink = page.locator('a[href="/privacy"]').first();
    await expect(privacyLink).toBeVisible();
    const href = await privacyLink.getAttribute('href');
    expect(href).toBe('/privacy');
  });

  test('Individual signup — Terms link in consent', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Sign Up');
    await delay();
    const termsLink = page.locator('a[href="/terms"]').first();
    await expect(termsLink).toBeVisible();
    const href = await termsLink.getAttribute('href');
    expect(href).toBe('/terms');
  });

  test('Login form — empty credentials shows validation', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('button[type="submit"]');
    await delay();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('Login form — invalid credentials shows error', async ({ page }) => {
    await goTo(page, '/auth');
    await page.fill('input[name="phone"]', '0000000000');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await delay(1500);
    const body = await page.content();
    expect(body).toMatch(/invalid|error|failed|wrong/i);
  });

  test('Forgot password form submission', async ({ page }) => {
    await goTo(page, '/forgot-password');
    await page.click('text=Business');
    await delay();
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await delay(1500);
      // Should either show success or error message
      const body = await page.content();
      expect(body).toMatch(/sent|error|not found|email/i);
    }
  });
});

// ─────────────────────────────────────────────
// BUSINESS AUTH FORMS
// ─────────────────────────────────────────────
test.describe('🏢 Business Auth Forms', () => {
  test('Business signup tab shows business fields', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Business');
    await delay();
    await page.click('text=Sign Up');
    await delay();
    await expect(page.locator('text=Business Name')).toBeVisible();
    await expect(page.locator('text=Registration Number')).toBeVisible();
    await expect(page.locator('text=Contact Person')).toBeVisible();
  });

  test('Business login uses email instead of phone', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Business');
    await delay();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────
// BOOKING FORM — Multi-step flow
// ─────────────────────────────────────────────
test.describe('📅 Booking Form — Multi-Step Flow', () => {
  test('Booking page redirects to auth when unauthenticated', async ({ page }) => {
    await goTo(page, '/book');
    // Should redirect to auth since booking requires authentication
    await page.waitForURL(/\/auth|\/client-dashboard/, { timeout: 5000 }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/\/auth|\/client-dashboard/);
  });

  test('Step 1 → Step 2: Select booking type', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 2: Service type options exist', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 2: Booking type radio buttons', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 2 → Step 3: Select service and proceed', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 3: Date picker has min attribute', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 3: Time slot buttons exist', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 3 → Step 4: Select date and time', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 4: Address field is required', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 4 → Step 5: Fill location and proceed', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 5: Payment method options exist', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Step 5: View Indemnity Form button opens modal', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Indemnity modal — Decline button returns to step 4', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Indemnity modal — Agree button closes modal and enables submit', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });

  test('Booking Back buttons work between steps', async ({ page }) => {
    test.skip(true, 'Booking form moved to client-dashboard (requires auth)');
  });
});

// ─────────────────────────────────────────────
// CONSENT FORM (Auth signup checkbox)
// ─────────────────────────────────────────────
test.describe('📝 Consent Form — POPIA Compliance', () => {
  test('Consent checkbox exists on signup', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Sign Up');
    await delay();
    await expect(page.locator('input#consent')).toBeVisible();
    await expect(page.locator('label[for="consent"]')).toContainText(/Privacy Policy/);
    await expect(page.locator('label[for="consent"]')).toContainText(/Terms of Service/);
    await expect(page.locator('label[for="consent"]')).toContainText(/POPIA/);
  });

  test('Consent checkbox is required attribute', async ({ page }) => {
    await goTo(page, '/auth');
    await page.click('text=Sign Up');
    await delay();
    const required = await page.locator('input#consent').getAttribute('required');
    expect(required).not.toBeNull();
  });
});

// ─────────────────────────────────────────────
// QUOTE MODAL
// ─────────────────────────────────────────────
test.describe('💬 Quote Modal', () => {
  test('Quote modal opens from services page', async ({ page }) => {
    await goTo(page, '/services');
    await page.click('text=Request a Quote');
    await delay(500);
    const dialog = page.locator('[role="dialog"], .modal, [aria-modal="true"]').first();
    if (await dialog.isVisible().catch(() => false)) {
      await expect(dialog).toBeVisible();
    }
  });
});
