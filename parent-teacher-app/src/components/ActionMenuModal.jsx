import React from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, TouchableWithoutFeedback, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';

export function ActionMenuModal({
  visible = false,
  onClose,
  title = 'Record Actions',
  subtitle,
  actions = [],
}) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <ThemedView type="backgroundElement" style={[styles.modalSheet, { backgroundColor: theme.backgroundElement }]}>
              {/* Top Drag Pill */}
              <View style={styles.dragPillWrapper}>
                <View style={[styles.dragPill, { backgroundColor: theme.backgroundSelected }]} />
              </View>

              {/* Title & Subtitle Header */}
              <View style={styles.header}>
                <ThemedText type="subtitle" style={styles.titleText}>{title}</ThemedText>
                {subtitle ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>

              {/* Action Buttons List */}
              <View style={styles.actionsContainer}>
                {actions.map((act, index) => {
                  const isDestructive = act.isDestructive;
                  const buttonBg = isDestructive ? '#FF3B3015' : act.color ? `${act.color}15` : theme.backgroundSelected;
                  const iconColor = isDestructive ? '#FF3B30' : act.color || '#14B8A6';
                  const textColor = isDestructive ? '#FF3B30' : theme.text;

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        onClose();
                        // Small timeout to allow modal animation to complete smoothly before action
                        setTimeout(() => {
                          if (act.onPress) act.onPress();
                        }, 150);
                      }}
                      activeOpacity={0.75}
                      style={[styles.actionBtn, { backgroundColor: buttonBg, borderColor: isDestructive ? '#FF3B3033' : `${iconColor}33` }]}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}22` }]}>
                        <SymbolView name={act.icon || 'square.and.pencil'} size={20} tintColor={iconColor} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" style={{ color: textColor, fontSize: 15 }}>
                          {act.label}
                        </ThemedText>
                        {act.description ? (
                          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                            {act.description}
                          </ThemedText>
                        ) : null}
                      </View>

                      <SymbolView name="chevron.right" size={14} tintColor={theme.textSecondary} />
                    </TouchableOpacity>
                  );
                })}

                {/* Cancel Button */}
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  style={[styles.cancelBtn, { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.textSecondary, fontSize: 14 }}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    borderTopWidth: 1,
    borderColor: '#e2e8f01a',
  },
  dragPillWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    marginVertical: Spacing.two,
    alignItems: 'center',
  },
  titleText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitleText: {
    marginTop: 4,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.three,
    height: 60,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
