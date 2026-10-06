/** Stable IDR presentation across Node/browser ICU currency-spacing versions. */
export function money(value: number, language: 'id' | 'en'): string {
  const amount = new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  // Currency label, minus placement and NBSP are intentional UI conventions.
  return `${value < 0 ? '-' : ''}${language === 'id' ? 'Rp' : 'IDR'}\u00a0${amount}`;
}
