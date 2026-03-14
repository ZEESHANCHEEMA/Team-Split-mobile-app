/**
 * Splitwise-Plus–style design tokens.
 * Light: background ~#FAF8F5, primary #E85C3A. Dark: dark grays, same primary.
 */
export type ThemeType = 'light' | 'dark';

const lightColors = {
  background: '#FAF8F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  primary: '#E85C3A',
  primaryTextOnPrimary: '#FFFFFF',
  secondary: '#E8EAEF',
  secondaryText: '#1A202C',
  muted: '#E8EAED',
  mutedText: '#6B7280',
  text: '#1A202C',
  accent: '#2D9D8A',
  accentTextOnAccent: '#FFFFFF',
  border: '#D8DBE2',
  input: '#D8DBE2',
  danger: '#D93030',
  success: '#1E9B6B',
  warning: '#E5A319',
};

const darkColors = {
  background: '#1A1D24',
  surface: '#252830',
  card: '#252830',
  primary: '#E85C3A',
  primaryTextOnPrimary: '#FFFFFF',
  secondary: '#2D323D',
  secondaryText: '#E8EAEF',
  muted: '#2D323D',
  mutedText: '#9CA3AF',
  text: '#F3F4F6',
  accent: '#2D9D8A',
  accentTextOnAccent: '#FFFFFF',
  border: '#374151',
  input: '#374151',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
};

export type Colors = typeof lightColors;

export function getColors(theme: ThemeType): Colors {
  return theme === 'dark' ? darkColors : lightColors;
}

/** Default export for backwards compatibility (light theme). */
export const colors = lightColors;

/** Border radius token (1rem = 16). Cards use 20 (rounded-2xl). */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

/** Main currencies: code, symbol, name for display. */
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
] as const;

export function getCurrencySymbol(code: string): string {
  const found = CURRENCIES.find((c) => c.code === code);
  return found ? found.symbol : code;
}
