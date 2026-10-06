import { test, expect } from '@playwright/test';
test('dashboard, capture, history and responsive navigation', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/preview');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Halo, Alex' })).toBeVisible();
  await expect(page.getByText('3 dari 5 selesai')).toBeVisible();
  await expect(page.getByText('750 / 2.000 ml').first()).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-light.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Tambah 250 ml', exact: true }).click();
  await expect(page.getByText('1.000 / 2.000 ml').first()).toBeVisible();
  await page.getByRole('button', { name: 'Catat aktivitas', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Nama', { exact: true }).fill('Latihan sore');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const nav = page.getByRole('navigation', {
    name: info.project.name === 'mobile' ? 'Navigasi mobile' : 'Navigasi utama',
    exact: true,
  });
  await nav.getByRole('button', { name: 'Riwayat', exact: true }).click();
  await expect(page.getByText('Latihan sore', { exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Keuangan', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah transaksi', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Transaksi', exact: true })
    .selectOption('transfer');
  await page.getByRole('dialog').getByLabel('Jumlah (IDR)', { exact: true }).fill('100000');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Dompet tujuan', exact: true })
    .selectOption('cash');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText(/Rp\s*1\.325\.000/, { exact: true })).toBeVisible();
  await expect(page.getByText(/Rp\s*300\.000/, { exact: true })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Pengaturan', exact: true })).toHaveCount(0);
  await page.getByRole('main').getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.getByRole('button', { name: 'Gelap', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan preferensi', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('combobox', { name: 'Bahasa', exact: true }).selectOption('en');
  await page.getByRole('button', { name: 'Simpan preferensi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', {
      name: info.project.name === 'mobile' ? 'Mobile navigation' : 'Main navigation',
      exact: true,
    })
    .getByRole('button', { name: 'Today', exact: true })
    .click();
  await page.screenshot({ path: `docs/screenshots/${info.project.name}-dark.png`, fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test('320px reflow and dialog keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/preview');
  await page.waitForLoadState('networkidle');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Catat aktivitas', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Catat aktivitas', exact: true })).toBeFocused();
});
test('closed API and no feed or payment activation', async ({ request }) => {
  const social = await request.get('/api/social');
  expect(social.status()).toBe(404);
  const payment = await request.post('/api/payments');
  expect(payment.status()).toBe(503);
  const command = await request.post('/api/commands', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: { action: 'wallet.create', name: 'attack', opening: 1 },
  });
  expect(command.status()).toBe(503);
  const wrongOrigin = await request.post('/api/commands', {
    headers: { origin: 'https://attacker.invalid' },
    data: {},
  });
  expect(wrongOrigin.status()).toBe(403);
});

test('tablet widths and reduced motion remain usable', async ({ page }) => {
  for (const width of [768, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/preview');
    await expect(page.getByRole('heading', { name: 'Halo, Alex' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  }
});
