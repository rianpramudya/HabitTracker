import { test, expect } from '@playwright/test';

test('server and hydrated rupiah text match exactly', async ({ browser, page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const serverContext = await browser.newContext({ javaScriptEnabled: false });
  try {
    const serverPage = await serverContext.newPage();
    await serverPage.goto('http://127.0.0.1:3000/preview');
    const serverText = await serverPage
      .locator('strong')
      .filter({ hasText: /^Rp/ })
      .allTextContents();
    expect(serverText).toContain('Rp\u00a075.000');
    await page.goto('/preview');
    await page.waitForLoadState('networkidle');
    const clientText = await page.locator('strong').filter({ hasText: /^Rp/ }).allTextContents();
    expect(clientText).toEqual(serverText);
    expect(errors).toEqual([]);
  } finally {
    await serverContext.close();
  }
});
