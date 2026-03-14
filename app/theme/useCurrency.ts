import { useAppSelector } from '../store/hooks';
import { getCurrencySymbol } from './colors';

export function useCurrency(): string {
  const code = useAppSelector((s) => s.settings.currency);
  return getCurrencySymbol(code);
}

export function useCurrencyCode(): string {
  return useAppSelector((s) => s.settings.currency);
}
