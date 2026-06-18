import { test, expect } from '@playwright/test';

test.describe('Chatbot API', () => {
  test('responds to service question with keyword matching', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'What services do you offer?' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('Residential Cleaning');
    expect(body.matched).toBe(true);
  });

  test('responds to pricing keywords', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'how much does it cost' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('R350');
    expect(body.matched).toBe(true);
  });

  test('responds to geofencing keywords', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'what is geofencing' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('virtual boundary');
    expect(body.matched).toBe(true);
  });

  test('responds to tracking keywords', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'how does tracking work' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('Transparency');
    expect(body.matched).toBe(true);
  });

  test('returns fallback for unknown questions', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'xyz123 nonsense query' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.matched).toBe(false);
    expect(body.answer).toContain('WhatsApp');
  });

  test('returns 400 for missing question', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('recognizes partial keywords without exact phrasing', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'price list' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('R350');
    expect(body.matched).toBe(true);
  });
});

test.describe('Chatbot Widget', () => {
  test('opens chat widget and shows suggested questions', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('button[aria-label="AI Assistant"]').first();
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.locator('text=Popular questions:')).toBeVisible();
    await expect(page.locator('text=What services do you offer?')).toBeVisible();
  });

  test('sends a message and receives a response', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('button[aria-label="AI Assistant"]').first();
    await button.click();
    const input = page.locator('input[placeholder="Ask me anything..."]').first();
    await input.fill('What services do you offer?');
    await input.press('Enter');
    await expect(page.locator('text=Residential Cleaning').first()).toBeVisible();
  });
});
