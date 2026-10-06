import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('visual review, same-state themes, secondary pages and temporary preview data', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(request.url()));
  const mobile = info.project.name === 'mobile';
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  const nav = page.getByRole('navigation', {
    name: mobile ? 'Navigasi mobile' : 'Navigasi utama',
    exact: true,
  });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/preview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
    const capture = page.getByRole('button', { name: 'Catat aktivitas', exact: true });
    const bounds = await capture.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(mobile ? 760 : 900);
    await page.screenshot({
      path: `docs/screenshots/redesign-${info.project.name}-${theme}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `docs/screenshots/redesign-${info.project.name}-${theme}-viewport.png`,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await capture.click();
    await page.screenshot({
      path: `docs/screenshots/redesign-${info.project.name}-${theme}-capture.png`,
    });
    await page.keyboard.press('Escape');
    await expect(capture).toBeFocused();
    for (const [label, slug] of [
      ['Riwayat', 'history'],
      ['Keuangan', 'finance'],
    ]) {
      await nav.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { name: label, exact: true, level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      await page.screenshot({
        path: `docs/screenshots/redesign-${info.project.name}-${theme}-${slug}.png`,
        fullPage: true,
      });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await expect(nav.getByRole('button', { name: 'Pengaturan', exact: true })).toHaveCount(0);
    await page.getByRole('main').getByRole('button', { name: 'Pengaturan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true, level: 1 })).toBeVisible();
    await page.screenshot({
      path: `docs/screenshots/redesign-${info.project.name}-${theme}-settings.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await nav.getByRole('button', { name: 'Hari Ini', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah 250 ml', exact: true }).click();
  await expect(page.getByText('1.000 / 2.000 ml')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('sementara');
  await nav.getByRole('button', { name: 'Riwayat', exact: true }).click();
  await expect(page.getByText('250 ml', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('750 / 2.000 ml')).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Belajar', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Simpan preferensi', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Arsipkan habit terkait');
  await expect(page.getByRole('checkbox', { name: 'Belajar', exact: true })).not.toBeChecked();
  await page.screenshot({ path: `docs/screenshots/redesign-${info.project.name}-error.png` });
  await page.getByRole('button', { name: 'Kosongkan data pratinjau', exact: true }).click();
  await nav.getByRole('button', { name: 'Hari Ini', exact: true }).click();
  await expect(page.getByText('Tidak ada kebiasaan terjadwal').first()).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/redesign-${info.project.name}-empty.png`,
    fullPage: true,
  });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Masuk', exact: true, level: 1 })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/redesign-${info.project.name}-access.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
