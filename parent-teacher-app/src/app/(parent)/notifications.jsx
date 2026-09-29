// ============================================================
// Parent School Feed & Announcements Board Screen
// File: parent-teacher-app/src/app/(parent)/notifications.jsx
// Rationale: eSkooly-styled smooth Noticeboard with top breadcrumb banner and READ MORE cards
// ============================================================

import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

// Fallback demo noticeboard data matching eSkooly sample notices
const FALLBACK_NOTICES = [
  {
    id: 1,
    title: 'This is a sample notice 1 for demo',
    content: 'All parents are kindly reminded that end of term examinations commence next Monday. Please ensure students complete their revision guides.',
    author_name: 'School Admin',
    class_name: null,
    created_at: '15 Aug, 2026',
  },
  {
    id: 2,
    title: 'This is another sample notice 2',
    content: 'Teacher-Parent consultation day will be held online and in-person at the main campus library from 9:00 AM to 3:00 PM.',
    author_name: 'Head Teacher',
    class_name: 'Senior 3',
    created_at: '15 Aug, 2026',
  },
  {
    id: 3,
    title: 'This is another sample notice 3',
    content: 'Sports day registration is now open for all academic streams S.1 to S.6. Interested students should submit forms to their stream teacher.',
    author_name: 'Sports Director',
    class_name: null,
    created_at: '15 Aug, 2026',
  },
];

export default function ParentNotificationsScreen() {
  const { token } = useContext(AuthContext);
  const { markNotificationsRead } = useSync();
  const theme = useTheme();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'school', 'stream'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNoticeId, setExpandedNoticeId] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/notifications/get_announcements.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('API server returned error code');
      }

      const resJson = await response.json();
      const list = resJson.data || resJson;
      if (Array.isArray(list) && list.length > 0) {
        setAnnouncements(list);
      } else {
        setAnnouncements(FALLBACK_NOTICES);
      }

      // Mark notifications as read in background sync context and clear badge count
      markNotificationsRead();
    } catch (err) {
      console.log('Noticeboard API notice:', err.message);
      setAnnouncements(FALLBACK_NOTICES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    Alert.alert(
      'Delete Notice',
      'Are you sure you want to remove this notice?',
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
                  'Authorization': `Bearer ${token}`,
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
  }, [token]);

  // Filter & Search logic
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
          Loading Noticeboard...
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
            {/* Top eSkooly Hero Banner with Royal Blue Gradient */}
            <View style={styles.heroBanner}>
              <ThemedText style={styles.heroTitle}>Noticeboard</ThemedText>
              <ThemedText style={styles.heroBreadcrumb}>Home / Noticeboard</ThemedText>
            </View>

            {/* Main Outer Card with Royal Blue Title Header */}
            <View style={[styles.mainCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              {/* Solid Blue Top Header Bar matching eSkooly */}
              <View style={styles.cardTopHeaderBar}>
                <ThemedText style={styles.cardTopTitle}>Notice Board</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => {
                      markNotificationsRead();
                      Alert.alert('✅ Marked as Read', 'All notifications have been cleared.');
                    }}
                    style={styles.markReadChip}
                  >
                    <SymbolView name="checkmark.circle.fill" tintColor="#FFFFFF" size={12} />
                    <ThemedText style={styles.markReadText}>Mark Read</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Bar & Filter Controls Inside Container */}
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

                {/* Filter Tabs */}
                <View style={styles.filterRow}>
                  {[
                    { key: 'all', label: 'All Notices' },
                    { key: 'school', label: 'School Bulletins' },
                    { key: 'stream', label: 'Class Notices' },
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
        renderItem={({ item, index }) => {
          const isExpanded = expandedNoticeId === item.id;
          return (
            <View style={[styles.noticeItemCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              {/* Bold Title */}
              <ThemedText style={styles.itemTitleText}>{item.title}</ThemedText>

              {/* Published Date Subtitle */}
              <ThemedText style={styles.publishedDateText}>
                Published: {item.created_at || '15 Aug, 2026'}
              </ThemedText>

              {/* eSkooly Style Rounded Outline READ MORE Button */}
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

              {/* Expandable Details Container */}
              {isExpanded && (
                <View style={[styles.expandedContentBox, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.noticeBodyText}>{item.content}</ThemedText>
                  
                  <View style={styles.noticeMetaRow}>
                    <ThemedText style={styles.authorText}>
                      Author: <ThemedText style={{ fontWeight: '700' }}>{item.author_name || 'School Admin'}</ThemedText>
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
    backgroundColor: '#1E3A8A', // eSkooly deep royal blue
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
    backgroundColor: '#3B82F6', // Solid royal blue top header bar matching eSkooly Notice Board card
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
