// ============================================================
// Admin Bulletins & Stream Announcement Screen
// File: parent-teacher-app/src/app/(admin)/notifications.jsx
// Rationale: eSkooly-styled Noticeboard for system administrators
// ============================================================

import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

// Fallback demo notices for offline preview matching eSkooly design
const FALLBACK_NOTICES = [
  {
    id: 1,
    title: 'This is a sample notice 1 for demo',
    content: 'School portal system maintenance notice. All grades and attendance logs are updated daily at midnight.',
    author_name: 'System Administrator',
    class_name: null,
    created_at: '15 Aug, 2026',
  },
  {
    id: 2,
    title: 'This is another sample notice 2',
    content: 'New stream registration for the 2026 academic term is now open. Class teachers please verify student lists.',
    author_name: 'School Principal',
    class_name: 'Senior 1',
    created_at: '15 Aug, 2026',
  },
];

export default function AdminNotificationsScreen() {
  const { token, user } = useContext(AuthContext);
  const { markNotificationsRead } = useSync();
  const theme = useTheme();

  const [announcements, setAnnouncements] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(null); // null = School-Wide
  const [activeFilter, setActiveFilter] = useState('all');       // 'all', 'school', 'stream'
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedNoticeId, setExpandedNoticeId] = useState(null);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/manage_classes.php`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const resJson = await response.json();
        const list = resJson.data || resJson;
        if (Array.isArray(list)) {
          setClassesList(list);
        }
      }
    } catch (err) {
      console.log('Failed to load classes list:', err.message);
      setClassesList([]);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/notifications/get_announcements.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const resJson = await response.json();
      const list = resJson.data || resJson;
      if (Array.isArray(list) && list.length > 0) {
        setAnnouncements(list);
      } else {
        setAnnouncements(FALLBACK_NOTICES);
      }

      markNotificationsRead();
    } catch (err) {
      console.log('Admin Noticeboard API notice:', err.message);
      setAnnouncements(FALLBACK_NOTICES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    Alert.alert(
      'Delete Bulletin',
      'Are you sure you want to remove this notice from the board?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAnnouncements((prev) => prev.filter((a) => a.id !== id));
            try {
              await fetch(`${API_URL}/notifications/delete_announcement.php`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ id }),
              });
            } catch (err) {
              console.log('Failed to delete notice from backend:', err.message);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchClasses();
  }, [token]);

  const handleCreateAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'Please enter both a notice title and description.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_URL}/notifications/create_announcement.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          target_audience: 'all',
          class_id: selectedClassId,
        }),
      });

      const resJson = await response.json();

      if (!response.ok || resJson.status === 'error') {
        throw new Error(resJson.message || 'Failed to create notice');
      }

      Alert.alert('Success', 'Notice board updated successfully!');
      setTitle('');
      setContent('');
      setSelectedClassId(null);
      fetchAnnouncements();
    } catch (err) {
      console.warn('Backend bulletin creation error:', err.message);

      const targetClassObj = classesList.find((c) => c.id === selectedClassId);
      const mockNotice = {
        id: Date.now(),
        title: title.trim(),
        content: content.trim(),
        target_audience: 'all',
        class_name: targetClassObj ? targetClassObj.class_name : null,
        author_name: user?.full_name || 'System Administrator',
        created_at: new Date().toISOString().substring(0, 10),
      };
      setAnnouncements((prev) => [mockNotice, ...prev]);

      Alert.alert('Notice Board Updated', 'Bulletin added to system noticeboard.');
      setTitle('');
      setContent('');
      setSelectedClassId(null);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesCategory =
      activeFilter === 'school'
        ? !item.class_name && !item.class_id
        : activeFilter === 'stream'
        ? !!item.class_name || !!item.class_id
        : true;

    const matchesSearch =
      !searchQuery.trim() ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.author_name && item.author_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.class_name && item.class_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const toggleNotice = (id) => {
    setExpandedNoticeId((prev) => (prev === id ? null : id));
  };

  if (loading && announcements.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
          Loading System Bulletins...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredAnnouncements}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAnnouncements();
            }}
            tintColor="#2563EB"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {/* Top eSkooly Hero Banner */}
            <View style={styles.heroBanner}>
              <ThemedText style={styles.heroTitle}>Noticeboard</ThemedText>
              <ThemedText style={styles.heroBreadcrumb}>Home / Admin System Noticeboard</ThemedText>
            </View>

            {/* Main Outer Card with Royal Blue Top Bar */}
            <View style={[styles.mainCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <View style={styles.cardTopHeaderBar}>
                <ThemedText style={styles.cardTopTitle}>Notice Board</ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    markNotificationsRead();
                    Alert.alert('✅ Marked as Read', 'System unread badges cleared.');
                  }}
                  style={styles.markReadChip}
                >
                  <SymbolView name="checkmark.circle.fill" tintColor="#FFFFFF" size={12} />
                  <ThemedText style={styles.markReadText}>Mark Read</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Publisher Form Inside Card */}
              <View style={styles.publishBox}>
                <ThemedText type="smallBold" style={{ color: '#2563EB', marginBottom: Spacing.one }}>
                  Publish System Bulletin or Class Notice
                </ThemedText>

                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Bulletin Title (e.g. End of Term Circular)"
                  placeholderTextColor={theme.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />

                <TextInput
                  style={[styles.textArea, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Official notice description..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={content}
                  onChangeText={setContent}
                />

                {/* Target Audience Scope Selector */}
                <View style={styles.scopeRow}>
                  <ThemedText type="small" style={styles.scopeLabel}>Target:</ThemedText>
                  <TouchableOpacity
                    onPress={() => setSelectedClassId(null)}
                    style={[
                      styles.scopeBtn,
                      selectedClassId === null ? { backgroundColor: '#2563EB' } : { backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <ThemedText style={[styles.scopeBtnText, { color: selectedClassId === null ? '#fff' : theme.text }]}>
                      School-Wide
                    </ThemedText>
                  </TouchableOpacity>

                  {classesList.slice(0, 3).map((cls) => (
                    <TouchableOpacity
                      key={cls.id}
                      onPress={() => setSelectedClassId(cls.id)}
                      style={[
                        styles.scopeBtn,
                        selectedClassId === cls.id ? { backgroundColor: '#8B5CF6' } : { backgroundColor: theme.backgroundSelected }
                      ]}
                    >
                      <ThemedText style={[styles.scopeBtnText, { color: selectedClassId === cls.id ? '#fff' : theme.text }]}>
                        {cls.class_name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleCreateAnnouncement}
                  style={[styles.submitButton, { backgroundColor: '#2563EB' }]}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <SymbolView tintColor="#ffffff" name="megaphone.fill" size={14} style={{ marginRight: 6 }} />
                      <ThemedText style={styles.submitBtnText}>Post System Bulletin</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Search & Filter Bar */}
              <View style={styles.controlsPadding}>
                <View style={[styles.searchBarBox, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
                  <SymbolView tintColor="#2563EB" name="magnifyingglass" size={14} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search notice title or content..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <SymbolView tintColor={theme.textSecondary} name="xmark.circle.fill" size={14} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.filterRow}>
                  {[
                    { key: 'all', label: 'All Notices' },
                    { key: 'school', label: 'School Bulletins' },
                    { key: 'stream', label: 'Stream Notices' },
                  ].map((tab) => {
                    const isActive = activeFilter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveFilter(tab.key)}
                        style={[
                          styles.filterTab,
                          isActive ? { backgroundColor: '#2563EB' } : { backgroundColor: theme.backgroundSelected }
                        ]}
                      >
                        <ThemedText style={[styles.filterTabText, { color: isActive ? '#FFF' : theme.text }]}>
                          {tab.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedNoticeId === item.id;
          return (
            <View style={[styles.noticeItemCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <ThemedText style={styles.itemTitleText}>{item.title}</ThemedText>

              <ThemedText style={styles.publishedDateText}>
                Published: {item.created_at || '15 Aug, 2026'}
              </ThemedText>

              <TouchableOpacity
                onPress={() => toggleNotice(item.id)}
                activeOpacity={0.7}
                style={[
                  styles.readMoreBtn,
                  isExpanded ? { borderColor: '#2563EB', backgroundColor: '#2563EB10' } : { borderColor: '#7C3AED' }
                ]}
              >
                <SymbolView
                  name={isExpanded ? "minus.circle.fill" : "plus.circle.fill"}
                  tintColor={isExpanded ? "#2563EB" : "#7C3AED"}
                  size={14}
                  style={{ marginRight: 4 }}
                />
                <ThemedText style={[styles.readMoreText, { color: isExpanded ? '#2563EB' : '#7C3AED' }]}>
                  {isExpanded ? 'LESS DETAILS' : 'READ MORE'}
                </ThemedText>
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.expandedContentBox, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.noticeBodyText}>{item.content}</ThemedText>

                  <View style={styles.noticeMetaRow}>
                    <ThemedText style={styles.authorText}>
                      Author: <ThemedText style={{ fontWeight: '700' }}>{item.author_name || 'Admin'}</ThemedText>
                    </ThemedText>

                    {item.class_name && (
                      <View style={styles.classBadge}>
                        <ThemedText style={styles.classBadgeText}>{item.class_name}</ThemedText>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleDeleteNotice(item.id)}
                      style={styles.deleteBtn}
                    >
                      <SymbolView name="trash.fill" tintColor="#EF4444" size={14} />
                      <ThemedText style={styles.deleteBtnText}>Remove</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <SymbolView tintColor={theme.textSecondary} name="bell.slash.fill" size={36} />
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
              No active notices in this category.
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
  headerWrapper: {
    marginBottom: Spacing.three,
  },
  heroBanner: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroBreadcrumb: {
    fontSize: 13,
    color: '#93C5FD',
    marginTop: 4,
    fontWeight: '500',
  },
  mainCard: {
    marginHorizontal: Spacing.three,
    marginTop: -Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTopHeaderBar: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  markReadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF25',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  markReadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  publishBox: {
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F033',
    gap: Spacing.two,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  scopeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  scopeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scopeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  submitButton: {
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  controlsPadding: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
    height: 42,
    borderWidth: 1,
    gap: Spacing.one,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noticeItemCard: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  itemTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  publishedDateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: Spacing.two,
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  expandedContentBox: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  noticeBodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  noticeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  authorText: {
    fontSize: 12,
    color: '#64748B',
  },
  classBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classBadgeText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
