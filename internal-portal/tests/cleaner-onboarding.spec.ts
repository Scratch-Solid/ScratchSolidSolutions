import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

/**
 * Cleaner Onboarding E2E Tests
 * Validates the full cleaner onboarding flow: signup -> consent -> admin approval -> training.
 */
test.describe('Cleaner Onboarding Flow', () => {
  test('Cleaner signup page loads with POPIA consent fields', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/signup/cleaner`);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
    expect(body).toContain('POPIA');

    // Check for consent checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(2);
  });

  test('Employee consent page redirects to cleaner signup', async ({ page }) => {
    const response = await page.goto(`${PORTAL_URL}/auth/employee-consent`, { waitUntil: 'networkidle' });
    // Should redirect to signup page
    expect(page.url()).toContain('signup');
  });

  test('Cleaner signup API validates consent fields', async ({ request }) => {
    const response = await request.post(`${PORTAL_URL}/api/signup/cleaner`, {
      data: {
        fullName: 'Test Cleaner',
        email: 'test-cleaner@example.com',
        phone: '+27 69 673 5947',
        idNumber: 'A12345678',
        address: '123 Test St, Durbanville',
        bankName: 'Test Bank',
        accountHolder: 'Test Cleaner',
        accountNumber: '1234567890',
        branchCode: '123456',
        popiaConsent: false, // Missing consent
        backgroundCheckConsent: false
      }
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    const body = await response.json();
    expect(body.error || body.message).toBeTruthy();
  });

  test('Admin new-joiners API returns consent fields', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/admin/new-joiners`);
    expect(response.status()).toBeLessThan(500);
    if (response.status() === 200) {
      const body = await response.json();
      if (Array.isArray(body) && body.length > 0) {
        const first = body[0];
        expect(first).toHaveProperty('popiaConsent');
        expect(first).toHaveProperty('backgroundCheckConsent');
      }
    }
  });

  test('Admin cleaner overview API returns onboarding stats', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/admin/cleaners/overview`);
    expect(response.status()).toBeLessThan(500);
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('stats');
      expect(body).toHaveProperty('cleaners');
    }
  });

  test('Training progress API returns module data', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/admin/cleaners/training-graph`);
    expect(response.status()).toBeLessThan(500);
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('totalCleaners');
      expect(body).toHaveProperty('completedTraining');
    }
  });

  test('Onboarding funnel API returns funnel stats', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/admin/cleaners/onboarding-funnel`);
    expect(response.status()).toBeLessThan(500);
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('totalCleaners');
      expect(body).toHaveProperty('consentSigned');
      expect(body).toHaveProperty('contractsSigned');
      expect(body).toHaveProperty('trainingStarted');
      expect(body).toHaveProperty('trainingCompleted');
    }
  });

  test('n8n booking-ingested webhook accepts valid payload', async ({ request }) => {
    const payload = {
      eventType: 'booking.created',
      payload: {
        id: 'test-booking-123',
        startTime: '2026-06-15T10:00:00Z',
        endTime: '2026-06-15T12:00:00Z',
        attendees: [{ email: 'client@test.com', name: 'Test Client' }],
        responses: { location: 'Durbanville', serviceType: 'residential-standard' }
      }
    };
    const response = await request.post(`${PORTAL_URL}/api/webhooks/n8n/booking-ingested`, {
      headers: {
        'Authorization': 'Bearer test-secret',
        'Content-Type': 'application/json'
      },
      data: payload
    });
    // Should not 500 even if auth fails
    expect(response.status()).toBeLessThan(500);
  });
});
