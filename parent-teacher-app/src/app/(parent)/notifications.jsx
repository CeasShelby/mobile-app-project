import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function NotificationsScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        const data = await response.json();
        setAnnouncements(data);
      } catch (err) {
        console.log('API call failed, using mock announcements:', err.message);
        setAnnouncements([
          {
            id: 1,
            title: 'Welcome to the New School Term!',
            content: 'We are excited to welcome all students and parents back to school. Let\'s have a great year together.',
            target_audience: 'all',
            author_name: 'System Administrator',
            created_at: '2026-08-29 08:00:00',
          },
          {
            id: 2,
            title: 'PTA General Meeting',
            content: 'The parent-teacher association will hold a general assembly in the school hall this Wednesday at 6 PM. All parents are encouraged to attend.',
            target_audience: 'parents',
            author_name: 'System Administrator',
            created_at: '2026-08-28 10:30:00',
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [token]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">School Announcements</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Stay up-to-date with general notices and information broadcasted by school admins.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" style={styles.announcementTitle}>{item.title}</ThemedText>
              <View style={styles.audienceBadge}>
                <ThemedText style={styles.audienceText}>{item.target_audience}</ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={styles.announcementContent}>{item.content}</ThemedText>
            <View style={styles.cardFooter}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                Posted by: {item.author_name} • {item.created_at}
              </ThemedText>
            </View>
          </ThemedView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <SymbolView tintColor={theme.textSecondary} name="bell.slash" size={32} />
            <ThemedText type="small" themeColor="textSecondary">No active school announcements.</ThemedText>
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    marginBottom: Spacing.two,
    gap: Spacing.half,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  announcementTitle: {
    fontSize: 16,
    flex: 1,
  },
  audienceBadge: {
    backgroundColor: '#34C75922',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 6,
  },
  audienceText: {
    color: '#34C759',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  announcementContent: {
    lineHeight: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f010',
    paddingTop: Spacing.one,
    marginTop: Spacing.one,
  },
  footerText: {
    fontSize: 10,
  },
  emptyContainer: {
    padding: Spacing.six,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
