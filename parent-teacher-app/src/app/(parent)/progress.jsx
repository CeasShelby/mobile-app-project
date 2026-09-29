import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { getParentDashboard } from '@/services/parent';
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

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch parent's actual linked children
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setLoading(true);
        const dashData = await getParentDashboard();
        const childrenList = dashData?.data?.students || dashData?.students || [];

        if (Array.isArray(childrenList) && childrenList.length > 0) {
          setStudents(childrenList);
          setSelectedStudent(childrenList[0]);
        }
      } catch (err) {
        console.log('Failed to fetch parent linked children for progress:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [token]);

  // 2. Fetch live progress records for selected child
  useEffect(() => {
    if (!selectedStudent) return;

    const fetchProgress = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/progress/get_progress.php?student_id=${selectedStudent.id}`, {
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
          } else {
            setRecords([]);
          }
        }
      } catch (err) {
        console.log('Failed to fetch parent progress data:', err.message);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [selectedStudent, token]);

  if (loading && !selectedStudent) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={records}
        keyExtractor={(item) => (item.id || Math.random()).toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Multi-Child Selector Chips */}
            {students.length > 1 && (
              <View style={styles.childChipsRow}>
                {students.map((child) => {
                  const isSelected = selectedStudent?.id === child.id;
                  return (
                    <TouchableOpacity
                      key={child.id}
                      onPress={() => setSelectedStudent(child)}
                      style={[
                        styles.childChip,
                        { backgroundColor: isSelected ? '#14B8A6' : theme.backgroundElement }
                      ]}
                    >
                      <ThemedText style={{ color: isSelected ? '#ffffff' : theme.text, fontWeight: 'bold', fontSize: 12 }}>
                        {child.full_name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <ThemedText type="subtitle">
              {selectedStudent ? `${selectedStudent.full_name}'s Academic Report` : 'Academic Report Card'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Subject grades, UNEB scale scores, and teacher evaluation comments.
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <SymbolView tintColor={theme.textSecondary} name="doc.text.magnifyingglass" size={36} />
              <ThemedText type="smallBold" style={{ marginTop: 8 }}>No Assessment Grades</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {selectedStudent ? `No exam or quiz marks recorded yet for ${selectedStudent.full_name}.` : 'No child linked to account.'}
              </ThemedText>
            </ThemedView>
          )
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
                <ThemedText style={styles.gradeText}>{item.grade}</ThemedText>
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

            {item.teacher_name && (
              <View style={styles.cardFooter}>
                <View style={styles.teacherInfoRow}>
                  <SymbolView tintColor={theme.textSecondary} name="person.circle" size={14} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.teacherText}>
                    Teacher: {item.teacher_name}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => router.push('/(parent)/messaging')}
                >
                  <SymbolView tintColor="#ffffff" name="bubble.left.and.bubble.right.fill" size={12} />
                  <ThemedText style={styles.chatButtonText}>Chat</ThemedText>
                </TouchableOpacity>
              </View>
            )}
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
    gap: Spacing.two,
  },
  header: {
    marginBottom: Spacing.two,
    gap: Spacing.half,
  },
  childChipsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  childChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 14,
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
    backgroundColor: '#14B8A622',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 8,
  },
  gradeText: {
    color: '#14B8A6',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cardBody: {
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
    backgroundColor: '#14B8A6',
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
    marginTop: Spacing.three,
  },
});
