import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('account forms fail honestly, preserve email and persist public language', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('person@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password-only');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Layanan akun' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('person@example.test');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('combobox', { name: 'Bahasa', exact: true }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goto('/auth/register');
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('person@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password-only');
  await page.getByLabel('Confirm password', { exact: true }).fill('synthetic-password-only');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'no account was created' })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/register$/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.screenshot({
      path: `docs/screenshots/account-${info.project.name}-${theme}.png`,
      fullPage: true,
    });
  }
  for (const path of ['verify', 'setup', 'reset', 'recover']) {
    await page.goto(`/auth/${path}`);
    await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Kode verifikasi' })).toHaveCount(0);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test('restricted account API rejects invalid and cross-origin requests', async ({ request }) => {
  const response = await request.post('/api/account', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: { action: 'setup', verified: true, role: 'admin' },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ ok: false, code: 'invalid' });
  expect(
    (
      await request.post('/api/account', {
        headers: { origin: 'https://invalid.test' },
        data: { action: 'login' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/preferences', {
        headers: { origin: 'http://127.0.0.1:3000' },
        data: { language: 'en', owner_id: 'attacker' },
      })
    ).status(),
  ).toBe(400);
});

test('account shell requires a real session', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('private-data activation requires a signed-in allowlisted owner', async ({ request }) => {
  const response = await request.post('/api/account/activate', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: { name: 'Synthetic', health: true, finance: true, understood: true },
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ ok: false, code: 'unavailable' });
});
