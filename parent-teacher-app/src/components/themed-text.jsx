import { Platform, StyleSheet, Text } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ThemedText({ style, type = 'default', themeColor, ...rest }) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'cardTitle' && styles.cardTitle,
        type === 'subtitle' && styles.subtitle,
        type === 'badge' && styles.badge,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  link: {
    lineHeight: 24,
    fontSize: 15,
  },
  linkPrimary: {
    lineHeight: 24,
    fontSize: 15,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 13,
  },
});
