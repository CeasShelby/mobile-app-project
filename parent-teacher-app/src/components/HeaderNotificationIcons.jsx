// ============================================================
// eSkooly Top Header Action Badges Component
// File: parent-teacher-app/src/components/HeaderNotificationIcons.jsx
// Rationale: Renders badged Message & Bell icons in screen headers to launch eSkooly Pop-Up Modals
// ============================================================

import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSync } from '@/context/SyncContext';
import { NotificationPopupModal } from './NotificationPopupModal';
import { ThemedText } from './themed-text';

export function HeaderNotificationIcons({ targetRole = 'parent' }) {
  const { unreadCounts } = useSync();
  const [modalMode, setModalMode] = useState(null); // 'notifications' | 'messages' | null

  const unreadMsg = unreadCounts?.unread_messages || 0;
  const unreadNotif = unreadCounts?.unread_notifications || 0;

  return (
    <>
      <View style={styles.container}>
        {/* Messages Icon with Badge Count */}
        <TouchableOpacity
          onPress={() => setModalMode('messages')}
          style={styles.iconCircle}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <SymbolView name="bubble.left.and.bubble.right.fill" tintColor="#2563EB" size={18} />
          <View style={[styles.badgePill, { backgroundColor: '#3B82F6' }]}>
            <ThemedText style={styles.badgeText}>{unreadMsg}</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Notifications Bell Icon with Badge Count */}
        <TouchableOpacity
          onPress={() => setModalMode('notifications')}
          style={styles.iconCircle}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <SymbolView name="bell.fill" tintColor="#8B5CF6" size={18} />
          <View style={[styles.badgePill, { backgroundColor: '#8B5CF6' }]}>
            <ThemedText style={styles.badgeText}>{unreadNotif}</ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      {/* Floating eSkooly Pop-Up Modal for Notifications or Messages */}
      <NotificationPopupModal
        visible={modalMode !== null}
        onClose={() => setModalMode(null)}
        targetRole={targetRole}
        mode={modalMode || 'notifications'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
