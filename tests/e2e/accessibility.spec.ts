import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('dashboard accessibility in light and dark', async ({ page }) => {
  await page.goto('/preview');
  await page.waitForLoadState('networkidle');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  await page.getByRole('main').getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.getByRole('button', { name: 'Gelap', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan preferensi', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const dark = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(dark.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
});
