import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

export default function ProgressScreen() {
  const { token, user } = useContext(AuthContext);
  const theme = useTheme();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/progress/get_progress.php`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setRecords(data);
          }
        }
      } catch (err) {
        console.log('Failed to fetch parent progress data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
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
        data={records}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">Academic Report Card</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Secondary school subject grades, exam scores, and teacher evaluation comments.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText type="smallBold" style={styles.subjectText}>
                  {item.subject_name} ({item.subject_code || 'SEC'})
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.assessment_name || 'Exam'} • {item.assessment_date}
                </ThemedText>
              </View>
              <View style={styles.gradeBadge}>
                <ThemedText style={styles.gradeText}>Grade {item.grade}</ThemedText>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.scoreRow}>
                <ThemedText type="small" themeColor="textSecondary">Marks Score: </ThemedText>
                <ThemedText type="smallBold">{item.marks_obtained} / {item.total_marks}</ThemedText>
              </View>
              {item.remarks && (
                <ThemedText type="small" style={styles.commentText}>
                  "{item.remarks}"
                </ThemedText>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.teacherInfoRow}>
                <SymbolView tintColor={theme.textSecondary} name="person.circle" size={14} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.teacherText}>
                  Subject Teacher: {item.teacher_name || 'Sarah Jenkins'}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => router.push('/(parent)/messaging')}
              >
                <SymbolView tintColor="#ffffff" name="bubble.left.and.bubble.right.fill" size={12} />
                <ThemedText style={styles.chatButtonText}>Message Teacher</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedView type="backgroundElement" style={styles.emptyContainer}>
            <SymbolView tintColor={theme.textSecondary} name="tray" size={32} />
            <ThemedText type="smallBold">No Exam Grades Logged Yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Subject teachers have not posted test results for this term yet.
            </ThemedText>
          </ThemedView>
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
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 15,
  },
  gradeBadge: {
    backgroundColor: '#208AEF22',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 8,
  },
  gradeText: {
    color: '#208AEF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cardBody: {
    paddingVertical: Spacing.one,
    gap: Spacing.half,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentText: {
    fontStyle: 'italic',
    marginTop: Spacing.one,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f010',
    paddingTop: Spacing.two,
  },
  teacherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  teacherText: {
    fontSize: 11,
  },
  chatButton: {
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    gap: 4,
  },
  chatButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: Spacing.six,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
