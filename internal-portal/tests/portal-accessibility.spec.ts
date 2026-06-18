import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

/**
 * Accessibility Audit
 * Uses axe-core via Playwright to scan key public pages.
 * Flags WCAG 2.1 A & AA violations.
 */

const PAGES_TO_SCAN = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/signup/cleaner',
  '/auth/create-profile',
  // '/auth/sign-contract' requires auth — redirects to login, skip in public scan
];

test.describe('Accessibility - axe-core scan', () => {
  for (const path of PAGES_TO_SCAN) {
    test(`${path} has no critical accessibility violations`, async ({ page }) => {
      await page.goto(`${PORTAL_URL}${path}`);
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      // Fail on critical/serious violations only
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations, `Critical accessibility violations on ${path}: ${criticalViolations.map(v => v.description).join(', ')}`).toEqual([]);
    });
  }
});
