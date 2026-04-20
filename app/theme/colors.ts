export type ThemeType = 'light' | 'dark';

const lightColors = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  primary: '#F2644B',
  primaryTextOnPrimary: '#FFFFFF',
  secondary: '#E9F0F7',
  secondaryText: '#18212F',
  muted: '#EDF3F8',
  mutedText: '#66768C',
  text: '#18212F',
  accent: '#1F9D84',
  accentTextOnAccent: '#FFFFFF',
  border: '#D6DFE8',
  input: '#D6DFE8',
  danger: '#D93030',
  success: '#159A6F',
  warning: '#D89A1C',
};

const darkColors = {
  background: '#0F1722',
  surface: '#162131',
  card: '#172334',
  primary: '#FF7A5C',
  primaryTextOnPrimary: '#FFFFFF',
  secondary: '#223044',
  secondaryText: '#F4F7FB',
  muted: '#223044',
  mutedText: '#9AA9BE',
  text: '#F4F7FB',
  accent: '#2AB69A',
  accentTextOnAccent: '#FFFFFF',
  border: '#314255',
  input: '#314255',
  danger: '#EF4444',
  success: '#2AD18D',
  warning: '#F6B73D',
};

export type Colors = typeof lightColors;

export function getColors(theme: ThemeType): Colors {
  return theme === 'dark' ? darkColors : lightColors;
}

/** Default export for backwards compatibility (light theme). */
export const colors = lightColors;

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
