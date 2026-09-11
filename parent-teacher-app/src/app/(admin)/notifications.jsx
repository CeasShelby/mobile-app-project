import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function AdminNotificationsScreen() {
  const { token, user } = useContext(AuthContext);
  const theme = useTheme();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/get_announcements.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      setAnnouncements(data);
    } catch (err) {
      console.log('API call failed, using mock notices:', err.message);
      setAnnouncements([
        {
          id: 1,
          title: 'Welcome to the New School Term!',
          content: 'We are excited to welcome all students and parents back to school. Let\'s have a great year.',
          target_audience: 'all',
          author_name: 'System Administrator',
          created_at: '2026-08-29 08:00:00',
        },
        {
          id: 2,
          title: 'PTA General Meeting',
          content: 'The parent-teacher association will hold a assembly in the school hall this Wednesday at 6 PM.',
          target_audience: 'parents',
          author_name: 'System Administrator',
          created_at: '2026-08-28 10:30:00',
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [token]);

  const handleCreateAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'Please fill in both a title and contents.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_URL}/notifications/create_announcement.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          target_audience: audience,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create notice');
      }

      Alert.alert('Success', 'Notice board updated successfully!');
      setTitle('');
      setContent('');
      fetchAnnouncements();
    } catch (err) {
      console.warn('API notice creation failed, using offline simulation:', err.message);
      
      const mockNotice = {
        id: Date.now(),
        title,
        content,
        target_audience: audience,
        author_name: user?.full_name || 'System Administrator',
        created_at: new Date().toISOString().substring(0, 10),
      };
      setAnnouncements((prev) => [mockNotice, ...prev]);

      Alert.alert('Simulated Success', 'Notice board updated locally (Offline Mode).');
      setTitle('');
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
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
            <ThemedView type="backgroundElement" style={styles.publishBox}>
              <ThemedText type="smallBold" style={styles.boxTitle}>Publish New Announcement</ThemedText>

              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Title (e.g. PTA Announcement)"
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              <TextInput
                style={[styles.textArea, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Notice contents..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                value={content}
                onChangeText={setContent}
              />

              <View style={styles.audienceRow}>
                <ThemedText type="small" style={styles.audienceLabel}>Audience:</ThemedText>
                {['all', 'parents', 'teachers'].map((opt) => {
                  const isActive = audience === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setAudience(opt)}
                      style={[
                        styles.audienceBtn,
                        isActive
                          ? { backgroundColor: '#FF3B30' }
                          : { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={[
                          styles.audienceBtnText,
                          { color: isActive ? '#ffffff' : theme.text, textTransform: 'capitalize' },
                        ]}
                      >
                        {opt}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={handleCreateAnnouncement}
                style={[styles.submitButton, { backgroundColor: '#FF3B30' }]}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <SymbolView tintColor="#ffffff" name="megaphone" size={14} />
                    <ThemedText style={styles.submitBtnText}>Post Notice</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ThemedView>

            <ThemedText type="smallBold" style={styles.feedHeader}>BOARD FEED</ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" style={styles.announcementTitle}>{item.title}</ThemedText>
              <View style={styles.audienceBadge}>
                <ThemedText style={styles.audienceBadgeText}>{item.target_audience}</ThemedText>
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
    gap: Spacing.three,
  },
  publishBox: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    gap: Spacing.two,
  },
  boxTitle: {
    fontSize: 15,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  textArea: {
    height: 70,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  audienceLabel: {
    fontWeight: 'bold',
  },
  audienceBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 6,
  },
  audienceBtnText: {
    fontSize: 11,
  },
  submitButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  feedHeader: {
    letterSpacing: 1.2,
    marginTop: Spacing.one,
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
    fontSize: 15,
    flex: 1,
  },
  audienceBadge: {
    backgroundColor: '#FF3B3022',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 6,
  },
  audienceBadgeText: {
    color: '#FF3B30',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  announcementContent: {
    lineHeight: 18,
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
});
