import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { getColors, radius } from './colors';

export function useTheme() {
  const theme = useAppSelector((s) => s.settings.theme);
  const colors = useMemo(() => getColors(theme), [theme]);
  return { colors, radius, theme };
}
