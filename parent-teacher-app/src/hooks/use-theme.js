import { useContext } from 'react';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context && context.theme) {
    return context.theme;
  }
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  return Colors[theme] || Colors.light;
}
