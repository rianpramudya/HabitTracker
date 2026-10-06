import { test, expect } from '@playwright/test';

test('feed denies navigation and direct API to unauthenticated visitors', async ({
  page,
  request,
}) => {
  await page.goto('/feed');
  await expect(page).not.toHaveURL(/\/feed$/);
  const read = await request.get('/api/social');
  expect([403, 404]).toContain(read.status());
  const write = await request.post('/api/social', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: { action: 'join', consent: 'social-dev-v1' },
  });
  expect([403, 404]).toContain(write.status());
});
