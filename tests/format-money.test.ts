import { expect, it } from 'vitest';
import { money } from '@/lib/format-money';

it.each([
  [75000, 'id', 'Rp\u00a075.000'],
  [0, 'id', 'Rp\u00a00'],
  [-75000, 'id', '-Rp\u00a075.000'],
  [1500000, 'en', 'IDR\u00a01,500,000'],
  [-75000, 'en', '-IDR\u00a075,000'],
] as const)('formats %s in %s with a stable currency separator', (value, language, expected) => {
  expect(money(value, language)).toBe(expected);
});
