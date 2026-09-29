// ============================================================
// Student Profile & History Screen
// File: parent-teacher-app/src/app/(parent)/student-profile.jsx
// Description: Comprehensive child profile, academic marks, attendance
// timeline, and teacher/guardian contact information.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { getStudentProfile } from '@/services/parent';

export default function StudentProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();

  const studentId = params.student_id ? parseInt(params.student_id, 10) : 0;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'academic'

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const res = await getStudentProfile(studentId || 0);
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to load student profile:', err);
      setError(err.message || 'Unable to connect to school server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getAttendanceBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return { bg: '#E8F5E9', text: '#2E7D32', label: 'Present' };
      case 'absent':
        return { bg: '#FFEBEE', text: '#C62828', label: 'Absent' };
      case 'late':
        return { bg: '#FFF8E1', text: '#F57F17', label: 'Late' };
      case 'excused':
        return { bg: '#E3F2FD', text: '#1565C0', label: 'Excused' };
      default:
        return { bg: '#F5F5F5', text: '#616161', label: status || 'Unknown' };
    }
  };

  const getGradeBadgeColor = (grade) => {
    if (!grade) return '#616161';
    const g = grade.toUpperCase();
    if (g.startsWith('A')) return '#2E7D32';
    if (g.startsWith('B')) return '#1565C0';
    if (g.startsWith('C')) return '#F57F17';
    if (g.startsWith('D')) return '#E65100';
    return '#C62828';
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerBox, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
          Loading student record...
        </ThemedText>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.centerBox, { backgroundColor: theme.background }]}>
        <SymbolView tintColor="#E53935" name="exclamationmark.triangle.fill" size={40} />
        <ThemedText type="subtitle" style={styles.errorTitle}>Could Not Load Record</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.errorSubtitle}>
          {error}
        </ThemedText>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <ThemedText type="smallBold" style={styles.retryBtnText}>Tap to Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const { student, homeroom_teacher, guardian, attendance, academic } = data || {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#14B8A6']}
        />
      }
    >
      {/* 1. HERO STUDENT HEADER CARD */}
      <ThemedView type="backgroundElement" style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarCircle}>
            <ThemedText style={styles.avatarText}>
              {getInitials(student?.full_name)}
            </ThemedText>
          </View>
          <View style={styles.heroDetails}>
            <View style={styles.nameBadgeRow}>
              <ThemedText type="subtitle" style={styles.studentName}>
                {student?.full_name}
              </ThemedText>
              <View style={styles.statusBadge}>
                <ThemedText style={styles.statusText}>{student?.status}</ThemedText>
              </View>
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.admText}>
              Admission No: {student?.admission_number}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {student?.class_name} • {student?.grade_level >= 5 ? 'A-Level Secondary' : 'O-Level Secondary'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Gender: {student?.gender} • DOB: {student?.date_of_birth}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* 2. SEGMENTED TAB NAVIGATION */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <ThemedText
            type="smallBold"
            style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}
          >
            Overview
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'attendance' && styles.tabItemActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <ThemedText
            type="smallBold"
            style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}
          >
            Attendance ({attendance?.percentage}%)
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'academic' && styles.tabItemActive]}
          onPress={() => setActiveTab('academic')}
        >
          <ThemedText
            type="smallBold"
            style={[styles.tabText, activeTab === 'academic' && styles.tabTextActive]}
          >
            Academics ({academic?.overall_average}%)
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 3. TAB CONTENT */}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <View style={styles.sectionContainer}>
          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <SymbolView tintColor="#14B8A6" name="chart.bar.fill" size={24} />
              <ThemedText type="title" style={styles.metricVal}>
                {attendance?.percentage}%
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Attendance Rate</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.metricSub}>
                {attendance?.present_days}/{attendance?.total_days} Days Present
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <SymbolView tintColor="#34C759" name="academiccap.fill" size={24} />
              <ThemedText type="title" style={styles.metricVal}>
                {academic?.overall_average}%
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Average Mark</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.metricSub}>
                {academic?.total_assessments} Evaluations Logged
              </ThemedText>
            </ThemedView>
          </View>

          {/* Homeroom Teacher Contact Card */}
          <ThemedText type="smallBold" style={styles.sectionHeader}>
            HOMEROOM TEACHER
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <View style={styles.teacherAvatar}>
                <SymbolView tintColor="#14B8A6" name="person.crop.circle" size={28} />
              </View>
              <View style={styles.contactInfo}>
                <ThemedText type="smallBold" style={styles.contactName}>
                  {homeroom_teacher?.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {homeroom_teacher?.specialization} • Emp ID: {homeroom_teacher?.employee_number}
                </ThemedText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(parent)/messaging')}
              >
                <SymbolView tintColor="#14B8A6" name="bubble.left.and.bubble.right.fill" size={16} />
                <ThemedText type="smallBold" style={styles.actionBtnText}>Send Message</ThemedText>
              </TouchableOpacity>

              {homeroom_teacher?.phone !== 'N/A' && (
                <TouchableOpacity
                  style={styles.actionBtnSecondary}
                  onPress={() => Linking.openURL(`tel:${homeroom_teacher.phone}`)}
                >
                  <SymbolView tintColor="#34C759" name="phone.fill" size={16} />
                  <ThemedText type="smallBold" style={styles.actionBtnTextSecondary}>Call</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </ThemedView>

          {/* Parent / Guardian Information Card */}
          {guardian && (
            <>
              <ThemedText type="smallBold" style={styles.sectionHeader}>
                GUARDIAN INFORMATION
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary">Name:</ThemedText>
                  <ThemedText type="smallBold">{guardian.name}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary">Relationship:</ThemedText>
                  <ThemedText type="smallBold">{guardian.relationship}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary">Emergency Phone:</ThemedText>
                  <ThemedText type="smallBold">{guardian.emergency_contact}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary">Occupation:</ThemedText>
                  <ThemedText type="small">{guardian.occupation}</ThemedText>
                </View>
              </ThemedView>
            </>
          )}
        </View>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <View style={styles.sectionContainer}>
          {/* Attendance Stats Breakdown Pill */}
          <ThemedView type="backgroundElement" style={styles.pillContainer}>
            <View style={styles.pillCol}>
              <ThemedText type="smallBold" style={{ color: '#2E7D32' }}>{attendance?.present_days}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Present</ThemedText>
            </View>
            <View style={styles.pillCol}>
              <ThemedText type="smallBold" style={{ color: '#F57F17' }}>{attendance?.late_days}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Late</ThemedText>
            </View>
            <View style={styles.pillCol}>
              <ThemedText type="smallBold" style={{ color: '#C62828' }}>{attendance?.absent_days}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Absent</ThemedText>
            </View>
            <View style={styles.pillCol}>
              <ThemedText type="smallBold" style={{ color: '#1565C0' }}>{attendance?.excused_days}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Excused</ThemedText>
            </View>
          </ThemedView>

          <ThemedText type="smallBold" style={styles.sectionHeader}>
            RECENT ATTENDANCE TIMELINE ({attendance?.history?.length} RECORDS)
          </ThemedText>

          {attendance?.history?.map((log) => {
            const badge = getAttendanceBadgeStyle(log.status);
            return (
              <ThemedView key={log.id} type="backgroundElement" style={styles.timelineCard}>
                <View style={styles.timelineRow}>
                  <View>
                    <ThemedText type="smallBold" style={styles.logDate}>{log.date}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Logged by: {log.recorded_by}
                    </ThemedText>
                  </View>
                  <View style={[styles.attBadge, { backgroundColor: badge.bg }]}>
                    <ThemedText style={[styles.attBadgeText, { color: badge.text }]}>
                      {badge.label}
                    </ThemedText>
                  </View>
                </View>

                {log.remarks && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.remarksText}>
                    Note: "{log.remarks}"
                  </ThemedText>
                )}
              </ThemedView>
            );
          })}
        </View>
      )}

      {/* ACADEMIC TAB */}
      {activeTab === 'academic' && (
        <View style={styles.sectionContainer}>
          <ThemedText type="smallBold" style={styles.sectionHeader}>
            SUBJECT ASSESSMENTS & MARKS ({academic?.records?.length} RECORDS)
          </ThemedText>

          {academic?.records?.map((record) => {
            const gradeColor = getGradeBadgeColor(record.grade);
            return (
              <ThemedView key={record.id} type="backgroundElement" style={styles.academicCard}>
                <View style={styles.academicHeader}>
                  <View>
                    <ThemedText type="smallBold" style={styles.subjectName}>
                      {record.subject_name} ({record.subject_code})
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {record.assessment_title} • {record.date_recorded}
                    </ThemedText>
                  </View>

                  <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
                    <ThemedText style={styles.gradeText}>{record.grade}</ThemedText>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.marksRow}>
                  <ThemedText type="small" themeColor="textSecondary">Score Achieved:</ThemedText>
                  <ThemedText type="smallBold" style={styles.marksVal}>
                    {record.marks} / {record.max_marks} ({Math.round((record.marks / record.max_marks) * 100)}%)
                  </ThemedText>
                </View>

                {record.comments && (
                  <View style={styles.commentBox}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.commentText}>
                      💬 "{record.comments}"
                    </ThemedText>
                  </View>
                )}
              </ThemedView>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
  },
  errorTitle: {
    marginTop: 12,
    color: '#E53935',
  },
  errorSubtitle: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
  },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  heroDetails: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  admText: {
    marginTop: 2,
    marginBottom: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#14B8A6',
  },
  tabText: {
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionContainer: {
    gap: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 6,
  },
  metricSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#14B8A6',
    marginTop: 8,
    marginBottom: 4,
  },
  contactCard: {
    padding: 16,
    borderRadius: 14,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherAvatar: {
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 12,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,138,239,0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    color: '#14B8A6',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,199,89,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnTextSecondary: {
    color: '#34C759',
  },
  infoCard: {
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillContainer: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  pillCol: {
    alignItems: 'center',
  },
  timelineCard: {
    padding: 14,
    borderRadius: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDate: {
    fontSize: 14,
  },
  attBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  remarksText: {
    marginTop: 6,
    fontStyle: 'italic',
  },
  academicCard: {
    padding: 14,
    borderRadius: 12,
  },
  academicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 15,
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  marksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marksVal: {
    color: '#14B8A6',
  },
  commentBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
  },
  commentText: {
    fontSize: 12,
  },
});
