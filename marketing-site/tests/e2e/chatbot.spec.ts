import { test, expect } from '@playwright/test';

test.describe.serial('Chatbot API', () => {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  test('responds to service question with keyword matching', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'What services do you offer?' },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('Residential Cleaning');
    expect(body.matched).toBe(true);
    await sleep(1000);
  });

  test('responds to pricing keywords', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'how much does it cost' },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('R350');
    expect(body.matched).toBe(true);
    await sleep(1000);
  });

  test('responds to geofencing keywords', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'what is geofencing' },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('virtual boundary');
    expect(body.matched).toBe(true);
    await sleep(1000);
  });

  test('responds to tracking keywords', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'how does tracking work' },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('Transparency');
    expect(body.matched).toBe(true);
    await sleep(1000);
  });

  test('returns fallback for unknown questions', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'xyz123 nonsense query' },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.matched).toBe(false);
    expect(body.answer).toContain('WhatsApp');
    await sleep(1000);
  });

  test('returns 400 for missing question', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: {},
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.status()).toBe(400);
    await sleep(1000);
  });

  test('recognizes partial keywords without exact phrasing', async ({ request }) => {
    const res = await request.post('/api/chatbot', {
      data: { question: 'price list' },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.answer).toContain('R350');
    expect(body.matched).toBe(true);
    await sleep(1000);
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
