import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';

export function QuickActionItem({ title, icon, color = '#14B8A6', onPress, badgeText }) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.gridItem,
        { backgroundColor: theme.backgroundElement, borderColor: `${color}25` }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <SymbolView name={icon} size={28} tintColor="#FFFFFF" />
        {badgeText ? (
          <View style={styles.badgeContainer}>
            <ThemedText style={styles.badgeText}>{badgeText}</ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText type="smallBold" style={styles.itemTitle} numberOfLines={1}>
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
}

export function QuickActionGrid({ sectionTitle, sectionIcon = 'apps.fill', items = [], columns = 3 }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.cardWrapper, { borderColor: '#e2e8f01a' }]}>
      {sectionTitle ? (
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionIconBadge, { backgroundColor: '#14B8A620' }]}>
            <SymbolView name={sectionIcon} size={18} tintColor="#14B8A6" />
          </View>
          <ThemedText type="cardTitle" style={styles.sectionTitle}>
            {sectionTitle}
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.gridContainer, columns === 2 ? styles.gridTwoCol : styles.gridThreeCol]}>
        {items.map((item, idx) => (
          <QuickActionItem
            key={idx}
            title={item.title}
            icon={item.icon}
            color={item.color}
            onPress={item.onPress}
            badgeText={item.badgeText}
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    padding: Spacing.four,
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.three,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  gridThreeCol: {
    justifyContent: 'flex-start',
  },
  gridTwoCol: {
    justifyContent: 'space-between',
  },
  gridItem: {
    flexBasis: '29%',
    flexGrow: 1,
    maxWidth: '31%',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
