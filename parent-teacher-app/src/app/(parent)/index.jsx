import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { getParentDashboard } from '@/services/parent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

export default function ParentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    parent_name: user?.full_name || 'Parent',
    students: [],
    announcements: []
  });

  const loadDashboardData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await getParentDashboard();
      if (res && res.students) {
        setData(res);
      }
    } catch (err) {
      console.log('Parent dashboard fetch error:', err.message);
      setError(err.message || 'Unable to connect to backend server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAttendanceStyle = (percentage) => {
    if (percentage >= 90) return styles.statValSuccess;
    if (percentage >= 75) return styles.statValWarning;
    return styles.statValDanger;
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboardData(true)}
          tintColor="#208AEF"
          colors={['#208AEF']}
        />
      }
    >
      <View style={styles.container}>
        {/* Welcome Header */}
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">Welcome Back,</ThemedText>
              <ThemedText type="subtitle" style={styles.parentName}>
                {data.parent_name || user?.full_name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.roleTag}>
                Parent Dashboard • {data.students.length} Linked {data.students.length === 1 ? 'Child' : 'Children'}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutButton} activeOpacity={0.7}>
              <SymbolView tintColor="#FF3B30" name="power" size={20} />
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Loading Spinner */}
        {loading && !refreshing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#208AEF" />
            <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
              Loading student progress & attendance...
            </ThemedText>
          </View>
        )}

        {/* Error Alert Banner */}
        {error && (
          <ThemedView style={styles.errorBox}>
            <SymbolView tintColor="#E53935" name="exclamationmark.triangle.fill" size={20} />
            <View style={styles.errorContent}>
              <ThemedText type="smallBold" style={styles.errorTitle}>Connection Notice</ThemedText>
              <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadDashboardData()}
              >
                <ThemedText type="smallBold" style={styles.retryText}>Tap to Retry</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}

        {/* My Students Roster Section */}
        {!loading && (
          <>
            <ThemedText type="smallBold" style={styles.sectionHeader}>
              MY STUDENTS ({data.students.length})
            </ThemedText>

            {data.students.length === 0 && !error ? (
              <ThemedView type="backgroundElement" style={styles.emptyBox}>
                <SymbolView tintColor="#208AEF" name="person.crop.circle.badge.questionmark" size={32} />
                <ThemedText type="smallBold" style={styles.emptyTitle}>No Children Linked</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  No active student records are linked to your parent account yet. Please contact the administration office.
                </ThemedText>
              </ThemedView>
            ) : (
              data.students.map((student) => {
                const latestGrade = student.recent_grades && student.recent_grades.length > 0
                  ? student.recent_grades[0]
                  : null;

                return (
                  <ThemedView key={student.id} type="backgroundElement" style={styles.studentCard}>
                    <View style={styles.studentHeader}>
                      <View style={styles.avatar}>
                        <ThemedText style={styles.avatarText}>{getInitials(student.full_name)}</ThemedText>
                      </View>
                      <View style={styles.studentInfo}>
                        <ThemedText type="smallBold" style={styles.studentName}>{student.full_name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Class: {student.class_name} • Adm: {student.admission_number}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Teacher: {student.homeroom_teacher}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statsRow}>
                      <View style={styles.statCol}>
                        <ThemedText type="small" themeColor="textSecondary">Attendance</ThemedText>
                        <ThemedText type="smallBold" style={getAttendanceStyle(student.attendance.percentage)}>
                          {student.attendance.percentage}%
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.subStatText}>
                          ({student.attendance.present_days}/{student.attendance.total_days} days)
                        </ThemedText>
                      </View>

                      <View style={styles.verticalDivider} />

                      <View style={styles.statCol}>
                        <ThemedText type="small" themeColor="textSecondary">Latest Result</ThemedText>
                        {latestGrade ? (
                          <>
                            <ThemedText type="smallBold" style={styles.statVal}>
                              {latestGrade.grade} ({latestGrade.marks}%)
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary" style={styles.subStatText}>
                              {latestGrade.subject_name}
                            </ThemedText>
                          </>
                        ) : (
                          <ThemedText type="small" themeColor="textSecondary">No marks logged</ThemedText>
                        )}
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <TouchableOpacity
                      style={styles.viewProfileBtn}
                      activeOpacity={0.7}
                      onPress={() => router.push({
                        pathname: '/(parent)/student-profile',
                        params: { student_id: student.id }
                      })}
                    >
                      <ThemedText type="smallBold" style={styles.viewProfileText}>
                        View Full Profile & History →
                      </ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                );
              })
            )}

            {/* School Announcements Section */}
            {data.announcements && data.announcements.length > 0 && (
              <>
                <ThemedText type="smallBold" style={styles.sectionHeader}>
                  SCHOOL ANNOUNCEMENTS
                </ThemedText>

                {data.announcements.map((announcement) => (
                  <ThemedView key={announcement.id} type="backgroundElement" style={styles.announcementCard}>
                    <View style={styles.announcementHeader}>
                      <SymbolView tintColor="#208AEF" name="megaphone.fill" size={18} />
                      <ThemedText type="smallBold" style={styles.announcementTitle}>
                        {announcement.title}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={styles.announcementContent}>
                      {announcement.content}
                    </ThemedText>
                    <View style={styles.announcementMeta}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                        Posted by {announcement.author_name} • {new Date(announcement.created_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </ThemedView>
                ))}
              </>
            )}

            {/* Quick Navigation Help Box */}
            <ThemedView type="backgroundElement" style={styles.helpBox}>
              <SymbolView tintColor="#208AEF" name="info.circle.fill" size={18} />
              <ThemedText type="small" style={styles.helpText}>
                Use the bottom navigation tabs to view complete academic progress reports, full attendance logs, or chat directly with teachers.
              </ThemedText>
            </ThemedView>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parentName: {
    fontWeight: 'bold',
  },
  roleTag: {
    marginTop: Spacing.one,
  },
  logoutButton: {
    padding: Spacing.two,
    borderRadius: 50,
    backgroundColor: '#FF3B301A',
  },
  loadingBox: {
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    marginTop: Spacing.one,
  },
  errorBox: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    gap: Spacing.two,
  },
  errorContent: {
    flex: 1,
    gap: Spacing.half,
  },
  errorTitle: {
    color: '#D32F2F',
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
  },
  retryButton: {
    marginTop: Spacing.one,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#208AEF',
  },
  sectionHeader: {
    marginTop: Spacing.two,
    letterSpacing: 1.2,
  },
  emptyBox: {
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    marginTop: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
  },
  studentCard: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  studentInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#208AEF22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#208AEF',
    fontWeight: 'bold',
    fontSize: 17,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f020',
    marginVertical: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e2e8f020',
  },
  statVal: {
    fontSize: 15,
  },
  statValSuccess: {
    fontSize: 15,
    color: '#34C759',
    fontWeight: 'bold',
  },
  statValWarning: {
    fontSize: 15,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  statValDanger: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  subStatText: {
    fontSize: 11,
  },
  announcementCard: {
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.one,
    borderLeftWidth: 3,
    borderLeftColor: '#208AEF',
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  announcementTitle: {
    fontSize: 15,
    flex: 1,
  },
  announcementContent: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
    marginTop: 2,
  },
  announcementMeta: {
    marginTop: Spacing.one,
  },
  metaText: {
    fontSize: 11,
  },
  helpBox: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#208AEF10',
    marginTop: Spacing.two,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    opacity: 0.9,
  },
  viewProfileBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 138, 239, 0.08)',
    borderRadius: 8,
  },
  viewProfileText: {
    color: '#208AEF',
    fontSize: 13,
  },
});
