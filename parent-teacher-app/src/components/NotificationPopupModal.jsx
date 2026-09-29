// ============================================================
// eSkooly Pop-Up Notification & Messages Modal
// File: parent-teacher-app/src/components/NotificationPopupModal.jsx
// Design: Matches the eSkooly screenshot — purple gradient header, plain list
//         with bell/chat circle icons, title + content preview, date pill,
//         dismiss X, and two full-width purple pill action buttons.
// ============================================================

import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetchNotifications, fetchMessagePreviews } from '@/services/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// No hardcoded demo/sample data — all items are fetched from the real backend

export function NotificationPopupModal({ visible, onClose, targetRole = 'parent', mode = 'notifications' }) {
  const { token } = useContext(AuthContext);
  const { markNotificationsRead, unreadCounts } = useSync();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      if (mode === 'messages') {
        const list = await fetchMessagePreviews();
        setItems(list);
      } else {
        const list = await fetchNotifications(null, false);
        setItems(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.log('Error fetching popup data:', err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, mode]);

  const handleDismissItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMarkAllRead = async () => {
    await markNotificationsRead();
    onClose();
  };

  const handleSeeMore = () => {
    onClose();
    if (mode === 'messages') {
      if (targetRole === 'admin') router.push('/(admin)/messaging');
      else if (targetRole === 'teacher') router.push('/(teacher)/messaging');
      else router.push('/(parent)/messaging');
    } else {
      if (targetRole === 'admin') router.push('/(admin)/notifications');
      else if (targetRole === 'teacher') router.push('/(teacher)/notifications');
      else router.push('/(parent)/notifications');
    }
  };

  const isMessagesMode = mode === 'messages';
  const unreadNum = isMessagesMode
    ? (unreadCounts?.unread_messages || 0)
    : (unreadCounts?.unread_notifications || 0);

  // Header solid background colour: purple for notifications, blue for messages
  const headerColor = isMessagesMode ? '#2563EB' : '#7C3AED';

  const iconBg = isMessagesMode ? '#DBEAFE' : '#EDE9FE';
  const iconTint = isMessagesMode ? '#2563EB' : '#5B21B6';
  const iconName = isMessagesMode ? 'bubble.left.fill' : 'bell.fill';
  const btnPrimary = isMessagesMode ? '#2563EB' : '#7C3AED';
  const btnSecondary = isMessagesMode ? '#1D4ED8' : '#6D28D9';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>

              {/* ── Purple / Blue solid header ── */}
              <View style={[styles.header, { backgroundColor: headerColor }]}>
                <Text style={styles.headerTitle}>
                  {unreadNum > 0
                    ? `${unreadNum} ${isMessagesMode ? 'Unread Messages' : 'Unread Notifications'}`
                    : isMessagesMode
                    ? 'No Unread Messages'
                    : 'No Unread Notification'}
                </Text>
              </View>

              {/* ── Scrollable items list ── */}
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {loading ? (
                  <View style={styles.centreBox}>
                    <ActivityIndicator color={btnPrimary} size="large" />
                    <Text style={styles.helperText}>Loading…</Text>
                  </View>
                ) : items.length === 0 ? (
                  <View style={styles.centreBox}>
                    <SymbolView
                      name={isMessagesMode ? 'bubble.left.and.bubble.right' : 'bell.slash'}
                      tintColor="#CBD5E1"
                      size={44}
                    />
                    <Text style={styles.helperText}>
                      {isMessagesMode
                        ? 'No conversations yet.'
                        : "You're all caught up — no notifications."}
                    </Text>
                  </View>
                ) : (
                  items.map((item, index) => {
                    const dateStr = item.created_at
                      ? item.created_at.substring(0, 10)
                      : null;
                    const bodyText = item.content || item.message || '';

                    return (
                      <View key={item.id.toString()}>
                        {index > 0 && <View style={styles.divider} />}
                        <View style={styles.row}>
                          {/* Left circle icon */}
                          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                            <SymbolView name={iconName} tintColor={iconTint} size={18} />
                            {isMessagesMode && item.unread_count > 0 && (
                              <View style={styles.unreadDot}>
                                <Text style={styles.unreadDotText}>{item.unread_count}</Text>
                              </View>
                            )}
                            {!isMessagesMode && item.is_read === 0 && (
                              <View style={[styles.unreadDot, { backgroundColor: '#7C3AED' }]} />
                            )}
                          </View>

                          {/* Content body */}
                          <View style={styles.body}>
                            <View style={styles.titleRow}>
                              <Text style={styles.itemTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              {dateStr && (
                                <View style={styles.datePill}>
                                  <Text style={styles.datePillText}>{dateStr}</Text>
                                </View>
                              )}
                              <TouchableOpacity
                                onPress={() => handleDismissItem(item.id)}
                                style={styles.xBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                activeOpacity={0.6}
                              >
                                <View style={styles.xCircle}>
                                  <Text style={styles.xText}>✕</Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                            {bodyText ? (
                              <Text style={styles.itemBody} numberOfLines={3}>
                                {bodyText}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* ── Footer action buttons ── */}
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  activeOpacity={0.85}
                  style={[styles.actionBtn, { backgroundColor: btnPrimary }]}
                >
                  <Text style={styles.actionBtnText}>MARK ALL AS READ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSeeMore}
                  activeOpacity={0.85}
                  style={[styles.actionBtn, { backgroundColor: btnSecondary }]}
                >
                  <Text style={styles.actionBtnText}>
                    {isMessagesMode ? 'OPEN CHAT INBOX' : 'SEE MORE'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 32, 420),
    maxHeight: '86%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 28,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  list: {
    maxHeight: 340,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 4,
  },
  centreBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 70,
    marginRight: 16,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadDotText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  itemBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  datePill: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  datePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  xBtn: {
    flexShrink: 0,
  },
  xCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  actionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
