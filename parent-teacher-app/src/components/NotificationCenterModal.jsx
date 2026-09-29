// ============================================================
// Event-Driven In-App Notification Center Modal
// File: parent-teacher-app/src/components/NotificationCenterModal.jsx
// Rationale: Provides a centralized alert inbox with category filters and mark-all-read controls
// ============================================================

import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetchNotifications, markAllNotificationsRead } from '@/services/notifications';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';

export function NotificationCenterModal({ visible, onClose }) {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const { refreshSync } = useSync();

  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'attendance', 'result', 'announcement', 'message'
  const [markingRead, setMarkingRead] = useState(false);

  const loadNotifications = async (filter = activeFilter) => {
    if (!visible) return;
    try {
      setLoading(true);
      const typeParam = filter === 'all' ? null : filter;
      const data = await fetchNotifications(typeParam, false);
      
      setNotificationsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('[NotificationModal] Fetch error:', err.message);
      setNotificationsList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadNotifications(activeFilter);
    }
  }, [visible, activeFilter]);

  const handleMarkAllRead = async () => {
    try {
      setMarkingRead(true);
      await markAllNotificationsRead();
      await refreshSync();
      // Update local state is_read flags
      setNotificationsList((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    } catch (err) {
      console.log('Mark all read error:', err.message);
    } finally {
      setMarkingRead(false);
    }
  };

  // Icon and color map per notification type
  const getTypeConfig = (type) => {
    switch (type) {
      case 'attendance':
        return {
          icon: 'calendar',
          color: '#FF9500',
          bg: '#FF950022',
          label: 'Attendance',
        };
      case 'result':
        return {
          icon: 'chart.bar.fill',
          color: '#34C759',
          bg: '#34C75922',
          label: 'Assessment',
        };
      case 'announcement':
        return {
          icon: 'megaphone.fill',
          color: '#14B8A6',
          bg: '#14B8A622',
          label: 'Notice',
        };
      case 'message':
        return {
          icon: 'bubble.left.and.bubble.right.fill',
          color: '#AF52DE',
          bg: '#AF52DE22',
          label: 'Direct Chat',
        };
      default:
        return {
          icon: 'bell.fill',
          color: '#8E8E93',
          bg: '#8E8E9322',
          label: 'System Alert',
        };
    }
  };

  const unreadCountInList = notificationsList.filter((n) => n.is_read == 0).length;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.headerNavBtn, { backgroundColor: theme.backgroundSelected }]}
          >
            <SymbolView tintColor="#14B8A6" name="chevron.left" size={14} />
            <ThemedText type="smallBold" style={{ color: '#14B8A6' }}>Back</ThemedText>
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            <SymbolView tintColor="#14B8A6" name="bell.fill" size={18} />
            <ThemedText type="subtitle" style={{ fontSize: 16 }}>Notifications</ThemedText>
            {unreadCountInList > 0 && (
              <View style={styles.headerBadge}>
                <ThemedText style={styles.headerBadgeText}>{unreadCountInList}</ThemedText>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.headerNavBtn, { backgroundColor: '#14B8A622' }]}
          >
            <ThemedText type="smallBold" style={{ color: '#14B8A6' }}>Done</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Prominent Open Mark All as Read Banner */}
        <View style={styles.openMarkReadBanner}>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markingRead}
            style={[
              styles.prominentMarkReadBtn,
              { backgroundColor: unreadCountInList > 0 ? '#14B8A6' : theme.backgroundSelected }
            ]}
          >
            {markingRead ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <SymbolView tintColor={unreadCountInList > 0 ? '#ffffff' : theme.textSecondary} name="checkmark.circle.fill" size={16} />
                <ThemedText style={[styles.prominentMarkReadText, { color: unreadCountInList > 0 ? '#ffffff' : theme.textSecondary }]}>
                  {unreadCountInList > 0 ? `Mark All ${unreadCountInList} Unread as Read` : 'All Notifications Marked as Read ✓'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All Alerts' },
            { key: 'attendance', label: 'Attendance' },
            { key: 'result', label: 'Marks & UNEB' },
            { key: 'announcement', label: 'Notices' },
            { key: 'message', label: 'Chat' },
          ].map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[
                  styles.filterChip,
                  isActive ? { backgroundColor: '#14B8A6' } : { backgroundColor: theme.backgroundSelected }
                ]}
              >
                <ThemedText style={[styles.filterChipText, { color: isActive ? '#ffffff' : theme.text }]}>
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List Content */}
        {loading && notificationsList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
          </View>
        ) : (
          <FlatList
            data={notificationsList}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadNotifications(activeFilter);
                }}
                tintColor="#14B8A6"
              />
            }
            renderItem={({ item }) => {
              const cfg = getTypeConfig(item.type);
              const isUnread = item.is_read == 0;

              return (
                <ThemedView
                  type="backgroundElement"
                  style={[
                    styles.card,
                    isUnread && { borderColor: '#14B8A688', borderWidth: 1.5 }
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.typeBadgeRow}>
                      <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                        <SymbolView tintColor={cfg.color} name={cfg.icon} size={16} />
                      </View>
                      <ThemedText style={[styles.typeLabel, { color: cfg.color }]}>
                        {cfg.label}
                      </ThemedText>
                    </View>

                    <View style={styles.cardMetaRight}>
                      {isUnread && <View style={styles.unreadDot} />}
                      <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
                        {item.created_at ? item.created_at.substring(0, 16) : ''}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText type="smallBold" style={styles.titleText}>
                    {item.title}
                  </ThemedText>
                  
                  <ThemedText type="small" style={styles.messageText}>
                    {item.message}
                  </ThemedText>

                  {isUnread && (
                    <View style={styles.cardFooterRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setNotificationsList(prev => prev.map(n => n.id === item.id ? { ...n, is_read: 1 } : n));
                          handleMarkAllRead();
                        }}
                        style={styles.cardMarkReadBtn}
                      >
                        <SymbolView tintColor="#14B8A6" name="checkmark.circle" size={14} />
                        <ThemedText style={styles.cardMarkReadText}>Mark as Read</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </ThemedView>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <SymbolView tintColor={theme.textSecondary} name="bell.slash" size={36} />
                <ThemedText type="small" themeColor="textSecondary">
                  No notifications in this category.
                </ThemedText>
              </View>
            }
          />
        )}

        {/* Sticky Bottom Close Bar */}
        <View style={styles.bottomCloseBar}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[styles.bottomCloseBtn, { backgroundColor: theme.backgroundElement, borderColor: '#14B8A644' }]}
          >
            <SymbolView tintColor="#14B8A6" name="arrow.left.circle.fill" size={18} />
            <ThemedText type="smallBold" style={{ color: '#14B8A6', fontSize: 13 }}>Return to App</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f01a',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerBadge: {
    backgroundColor: '#FF3B30',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 0,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  markReadBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    gap: Spacing.one,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  timeText: {
    fontSize: 10,
  },
  titleText: {
    fontSize: 14,
  },
  messageText: {
    lineHeight: 18,
  },
  emptyContainer: {
    padding: Spacing.six,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  openMarkReadBanner: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  prominentMarkReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    width: '100%',
  },
  prominentMarkReadText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f01a',
  },
  cardMarkReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#14B8A618',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardMarkReadText: {
    color: '#14B8A6',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomCloseBar: {
    padding: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f01a',
  },
  bottomCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
});
