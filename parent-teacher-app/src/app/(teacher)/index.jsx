// ============================================================
// Teacher Home Dashboard & Action Center Screen
// File: parent-teacher-app/src/app/(teacher)/index.jsx
// Rationale: Primary dashboard for S.1-S.6 secondary teachers with active class stats & notification bell
// ============================================================

import React, { useContext, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { TeacherClassContext } from '@/context/TeacherClassContext';
import { ActiveClassSelector } from '@/components/ActiveClassSelector';
import { NotificationCenterModal } from '@/components/NotificationCenterModal';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { QuickActionGrid } from '@/components/QuickActionGrid';
import { useSync } from '@/context/SyncContext';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const { selectedClass } = useContext(TeacherClassContext);
  const { unreadCounts } = useSync();
  const theme = useTheme();

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" themeColor="textSecondary">Welcome back,</ThemedText>
              <ThemedText type="subtitle" style={styles.teacherName}>{user?.full_name || 'Teacher'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.employeeInfo}>
                Employee No: {user?.employee_number || 'TCH2026001'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.employeeInfo}>
                Specialization: {user?.specialization || 'Secondary Mathematics & Physics'}
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <TouchableOpacity
                onPress={() => setShowProfileModal(true)}
                style={[styles.logoutButton, { backgroundColor: theme.backgroundSelected }]}
                activeOpacity={0.7}
              >
                <SymbolView tintColor="#34C759" name="person.crop.circle" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowNotifModal(true)}
                style={[styles.logoutButton, { backgroundColor: theme.backgroundSelected, position: 'relative' }]}
                activeOpacity={0.7}
              >
                <SymbolView tintColor="#34C759" name="bell.fill" size={20} />
                {unreadCounts?.total_unread > 0 && (
                  <View style={styles.heroBadgeDot}>
                    <ThemedText style={styles.heroBadgeText}>{unreadCounts.total_unread}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={logout} style={styles.logoutButton} activeOpacity={0.7}>
                <SymbolView tintColor="#FF3B30" name="power" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>

        <NotificationCenterModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />
        <ProfileEditModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />

        {/* Global Active Secondary Class Switcher */}
        <ActiveClassSelector title="ACTIVE SECONDARY CLASS SESSION (S.1–S.6)" />

        <ThemedText type="smallBold" style={styles.sectionHeader}>
          STREAM OVERVIEW ({selectedClass?.class_name || 'Active Session'})
        </ThemedText>
        
        <View style={styles.statsGrid}>
          <ThemedView type="backgroundElement" style={styles.gridItem}>
            <SymbolView tintColor="#34C759" name="person.3.fill" size={20} />
            <ThemedText type="subtitle">{selectedClass ? selectedClass.student_count : 0}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Enrolled Students</ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.gridItem}>
            <SymbolView tintColor="#14B8A6" name="graduationcap.fill" size={20} />
            <ThemedText type="subtitle">{selectedClass?.grade_level >= 5 ? 'A-Level' : 'O-Level'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Academic Cycle</ThemedText>
          </ThemedView>
        </View>

        {/* Teacher Rapid Class Actions */}
        <QuickActionGrid
          sectionTitle="Rapid Class Actions"
          sectionIcon="bolt.circle.fill"
          items={[
            {
              title: 'Take Roll Call',
              icon: 'checkmark.circle.badge.questionmark.fill',
              color: '#34C759',
              onPress: () => router.push('/(teacher)/attendance'),
            },
            {
              title: 'Record Marks',
              icon: 'plus.square.fill.on.square.fill',
              color: '#8B5CF6',
              onPress: () => router.push('/(teacher)/progress'),
            },
            {
              title: 'Contact Parents',
              icon: 'paperplane.fill',
              color: '#FF9500',
              onPress: () => router.push('/(teacher)/messaging'),
            },
            {
              title: 'Post Notice',
              icon: 'megaphone.fill',
              color: '#FF3B30',
              badgeText: unreadCounts?.total_unread > 0 ? `${unreadCounts.total_unread}` : null,
              onPress: () => setShowNotifModal(true),
            },
            {
              title: 'My Profile',
              icon: 'person.crop.circle.fill',
              color: '#5383EC',
              onPress: () => setShowProfileModal(true),
            },
          ]}
        />
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
    paddingBottom: 100,
  },
  heroCard: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  teacherName: {
    fontSize: 18,
    marginVertical: 2,
  },
  employeeInfo: {
    fontSize: 11,
    opacity: 0.8,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
  },
  heroBadgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 0,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  sectionHeader: {
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
    letterSpacing: 1.1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridItem: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    gap: Spacing.half,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionTextCol: {
    flex: 1,
    gap: 2,
  },
});
