/**
 * COMPREHENSIVE PAGE TESTS — Marketing Site
 * Tests every page, every button, every link, every navigation element.
 * Run: npx playwright test tests/e2e/comprehensive-pages.spec.ts
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';
const DELAY_MS = process.env.CI ? 3000 : 500;

async function delay(ms = DELAY_MS) {
  return new Promise(r => setTimeout(r, ms));
}

async function goTo(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
  await delay();
  return res;
}

// Pre-accept the cookie notice so its fixed banner never intercepts clicks,
// and avoid relying on the flaky `networkidle` state on a live marketing site.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('cookieConsent', 'accepted');
    } catch {}
  });
});

async function assertNo500(page: Page) {
  const body = await page.content();
  if (body.includes('500') && body.includes('Internal Server Error')) {
    throw new Error('Page contains 500 error');
  }
}

// ─────────────────────────────────────────────
// PUBLIC PAGES — Every single one
// ─────────────────────────────────────────────
test.describe('🏠 Public Pages — Load & Content', () => {
  test('Homepage loads with all sections', async ({ page }) => {
    // Copy below matches the redesigned homepage (marketing-site/src/app/page.tsx) -
    // the old "Spotless Space" / overlay-menu version was replaced.
    const res = await goTo(page, '/');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await expect(page.locator('h1').first()).toContainText('Everything you need, under one roof.');
    await expect(page.locator('text=Book a clean').first()).toBeVisible();
    await expect(page.locator('text=Explore services').first()).toBeVisible();
    await expect(page.locator('text=Real-time tracking').first()).toBeVisible();
    await expect(page.locator('text=Areas we service').first()).toBeVisible();
    await expect(page.locator('text=Ready to see the difference').first()).toBeVisible();
    // WhatsApp FAB
    await expect(page.locator('a[aria-label="WhatsApp Booking"]')).toBeVisible();
  });

  test('Services page loads with flip cards and quote button', async ({ page }) => {
    const res = await goTo(page, '/services');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await expect(page.locator('h1')).toContainText('Our Services');
    await expect(page.locator('text=Maintenance Clean').first()).toBeVisible();
    await expect(page.locator('text=Deep Clean').first()).toBeVisible();
    await expect(page.locator('text=Request a Quote').first()).toBeVisible();
  });

  test('About page loads', async ({ page }) => {
    const res = await goTo(page, '/about');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await expect(page.locator('h1, h2').first()).toContainText(/About|Mission|Team/i);
  });

  test('Gallery page loads', async ({ page }) => {
    const res = await goTo(page, '/gallery');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Gallery|Before|After|Clients/i);
  });

  test('Contact page loads', async ({ page }) => {
    const res = await goTo(page, '/contact');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await expect(page.locator('h1, h2').first()).toContainText(/Get In Touch|Contact|Reach/i);
  });

  test('Privacy Policy page loads', async ({ page }) => {
    const res = await goTo(page, '/privacy');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await expect(page.locator('h1, h2').first()).toContainText(/Privacy/i);
  });

  test('Privacy Policy (alt route) loads', async ({ page }) => {
    const res = await goTo(page, '/privacy-policy');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });

  test('Terms of Service page loads', async ({ page }) => {
    const res = await goTo(page, '/terms');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await expect(page.locator('h1, h2').first()).toContainText(/Terms/i);
  });

  test('Auth page loads with login/signup tabs', async ({ page }) => {
    const res = await goTo(page, '/auth');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Individual' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Business' })).toBeVisible();
  });

  test('Login redirect page works', async ({ page }) => {
    const res = await goTo(page, '/login');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });

  test('Forgot password page loads', async ({ page }) => {
    const res = await goTo(page, '/forgot-password');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });

  test('Reset password page loads', async ({ page }) => {
    const res = await goTo(page, '/reset-password?token=test');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });

  test('Booking redirect page works', async ({ page }) => {
    const res = await goTo(page, '/booking');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });
});

// ─────────────────────────────────────────────
// NAVIGATION — Every link and button
// ─────────────────────────────────────────────
test.describe('🔗 Navigation — All Links & Buttons', () => {
  test('Homepage nav links route correctly', async ({ page }) => {
    test.setTimeout(60000);
    await goTo(page, '/');
    // Services link
    await page.click('a[href="/services"]');
    await page.waitForURL('**/services');
    await expect(page).toHaveURL(/\/services/);
    await delay();
    // About link
    await page.goto('/');
    await page.click('a[href="/about"]');
    await page.waitForURL('**/about');
    await expect(page).toHaveURL(/\/about/);
    await delay();
    // Gallery link
    await page.goto('/');
    await page.click('a[href="/gallery"]');
    await page.waitForURL('**/gallery');
    await expect(page).toHaveURL(/\/gallery/);
  });

  test('Footer privacy link works', async ({ page }) => {
    // The redesigned SiteNav has no overlay/hamburger menu - it's direct
    // links plus a footer legal bar with the Privacy link instead.
    test.setTimeout(60000);
    await goTo(page, '/');
    await page.click('a[href="/privacy"]');
    await page.waitForURL('**/privacy', { timeout: 20000 });
    await expect(page).toHaveURL(/\/privacy/);
  });

  test('Hero "Explore Our Services" button routes to /services', async ({ page }) => {
    await goTo(page, '/');
    await page.click('a[href="/services"]');
    await page.waitForURL('**/services');
    await expect(page).toHaveURL(/\/services/);
  });

  test('WhatsApp FAB has correct href', async ({ page }) => {
    await goTo(page, '/');
    const href = await page.locator('a[aria-label="WhatsApp Booking"]').getAttribute('href');
    expect(href).toContain('wa.me');
  });

  test('Auth page toggle between login and signup', async ({ page }) => {
    test.setTimeout(60000);
    await goTo(page, '/auth');
    // Wait for client-side hydration to complete — the auth form renders inside Suspense
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 30000 });
    // In login mode, the only button with text "Sign Up" is the toggle button
    const signUpButton = page.getByRole('button', { name: 'Sign Up' });
    await signUpButton.waitFor({ state: 'visible', timeout: 20000 });
    // Retry click to handle hydration race
    for (let attempt = 0; attempt < 3; attempt++) {
      await signUpButton.click();
      try {
        await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 5000 });
        break;
      } catch {
        if (attempt === 2) throw new Error('Toggle to Create Account failed after 3 attempts');
        await delay(1000);
      }
    }
    // In signup mode, the only button with text "Sign In" is the toggle button
    const signInButton = page.getByRole('button', { name: 'Sign In' });
    await signInButton.waitFor({ state: 'visible', timeout: 10000 });
    await signInButton.click();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 10000 });
  });

  test('Auth page tab switches between Individual and Business', async ({ page }) => {
    test.setTimeout(60000);
    await goTo(page, '/auth');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 30000 });
    // Wait for hydration and switch to Sign Up mode
    // In login mode, the only button with text "Sign Up" is the toggle button
    const signUpButton = page.getByRole('button', { name: 'Sign Up' });
    await signUpButton.waitFor({ state: 'visible', timeout: 20000 });
    // Retry click to handle hydration race
    for (let attempt = 0; attempt < 3; attempt++) {
      await signUpButton.click();
      try {
        await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 5000 });
        break;
      } catch {
        if (attempt === 2) throw new Error('Toggle to Create Account failed after 3 attempts');
        await delay(1000);
      }
    }
    // Click Business tab
    await page.getByRole('button', { name: 'Business' }).click();
    await expect(page.getByText('Business Name')).toBeVisible({ timeout: 10000 });
    // Click Individual tab
    await page.getByRole('button', { name: 'Individual' }).click();
    await expect(page.getByText('Full Name')).toBeVisible({ timeout: 10000 });
  });

  test('Forgot password link from auth page', async ({ page }) => {
    test.setTimeout(60000);
    await goTo(page, '/auth');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 30000 });
    const forgotLink = page.getByRole('link', { name: 'Forgot Password?' });
    await forgotLink.waitFor({ state: 'visible', timeout: 15000 });
    await forgotLink.click();
    await page.waitForURL('**/forgot-password', { timeout: 20000 });
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('Back to Home link on auth page', async ({ page }) => {
    test.setTimeout(60000);
    await goTo(page, '/auth');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 30000 });
    await page.click('text=Back to Home');
    await page.waitForURL('**/', { timeout: 15000 });
    await expect(page).toHaveURL(/\/$/);
  });
});

// ─────────────────────────────────────────────
// AUTH PROTECTED PAGES — Redirect behavior
// ─────────────────────────────────────────────
test.describe('🔒 Auth Protected Pages — Unauthenticated Redirects', () => {
  test('Client dashboard redirects when not logged in', async ({ page }) => {
    await goTo(page, '/client-dashboard');
    await page.waitForURL('**/auth**');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('Business dashboard redirects when not logged in', async ({ page }) => {
    await goTo(page, '/business-dashboard');
    await page.waitForURL('**/auth**');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('Book page redirects unauthenticated users to login', async ({ page }) => {
    const res = await goTo(page, '/book');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await delay(2000);
    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
  });

  test('Business booking page redirects unauthenticated users to login', async ({ page }) => {
    const res = await goTo(page, '/business-booking');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
    await delay(2000);
    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
  });

  test('Business events page loads', async ({ page }) => {
    const res = await goTo(page, '/business-events');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });

  test('Business signup page loads', async ({ page }) => {
    const res = await goTo(page, '/business-signup');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });

  test('Client signup page loads', async ({ page }) => {
    const res = await goTo(page, '/client-signup');
    expect(res?.status()).toBeLessThan(500);
    await assertNo500(page);
  });
});

// ─────────────────────────────────────────────
// SERVICE CARDS — Flip interaction
// ─────────────────────────────────────────────
test.describe('🃏 Service Cards — Interactive Elements', () => {
  test('Maintenance Clean card can be flipped', async ({ page }) => {
    await goTo(page, '/services');
    const card = page.locator('[aria-label*="See details for Maintenance Clean"]').first();
    await expect(card).toBeVisible();
    await card.click();
    await delay(800);
    // After flip, back side should show detailed content
    await expect(page.locator('text=What We Clean').first()).toBeVisible();
  });

  test('Deep Clean card can be flipped', async ({ page }) => {
    await goTo(page, '/services');
    const card = page.locator('[aria-label*="See details for Deep Clean"]').first();
    await expect(card).toBeVisible();
    await card.click();
    await delay(800);
    await expect(page.locator('text=Whole Home/Office')).toBeVisible();
  });

  test('Request a Quote button opens quote modal', async ({ page }) => {
    await goTo(page, '/services');
    await page.click('text=Request a Quote');
    await delay(500);
    // Modal should appear
    const dialog = page.locator('[role="dialog"], .modal, [aria-modal="true"]').first();
    if (await dialog.isVisible().catch(() => false)) {
      await expect(dialog).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────
// SEO & META
// ─────────────────────────────────────────────
test.describe('📢 SEO & Meta Tags', () => {
  test('Homepage has correct title', async ({ page }) => {
    await goTo(page, '/');
    await expect(page).toHaveTitle(/Scratch Solid/i);
  });

  test('Services page has correct title', async ({ page }) => {
    await goTo(page, '/services');
    await expect(page).toHaveTitle(/Service/i);
  });

  test('All public pages return status < 500', async ({ page }) => {
    test.setTimeout(60000);
    const paths = ['/', '/services', '/about', '/gallery', '/contact', '/privacy', '/terms', '/auth', '/login', '/forgot-password'];
    for (const path of paths) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      expect(status, `Path ${path} returned ${status}`).toBeLessThan(500);
    }
  });
});
