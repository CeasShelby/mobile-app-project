import React, { useContext, useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

import { useSync } from '@/context/SyncContext';
import { useRouter } from 'expo-router';
import { NotificationCenterModal } from '@/components/NotificationCenterModal';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { CustomLoader } from '@/components/CustomLoader';
import { ActionMenuModal } from '@/components/ActionMenuModal';
import { QuickActionGrid } from '@/components/QuickActionGrid';

export default function AdminDashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const { unreadCounts } = useSync();
  const router = useRouter();
  const theme = useTheme();
  const [metrics, setMetrics] = useState({
    total_classes: 0,
    total_students: 0,
    total_teachers: 0,
    total_parents: 0,
    total_staff: 0,
  });
  const [classesList, setClassesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState("O'Level (S1-S4)");
  const [academicYear, setAcademicYear] = useState('2026');
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const ugandanPresets = [
    { label: 'Senior 1 (S1)', level: "O'Level (S1-S4)" },
    { label: 'Senior 2 (S2)', level: "O'Level (S1-S4)" },
    { label: 'Senior 3 (S3)', level: "O'Level (S1-S4)" },
    { label: 'Senior 4 (S4)', level: "O'Level (S1-S4)" },
    { label: 'Senior 5 Arts (S5)', level: "A'Level (S5-S6)" },
    { label: 'Senior 5 Science (S5)', level: "A'Level (S5-S6)" },
    { label: 'Senior 6 Arts (S6)', level: "A'Level (S5-S6)" },
    { label: 'Senior 6 Science (S6)', level: "A'Level (S5-S6)" },
  ];

  const fetchOverview = async (isManualRefresh = false) => {
    if (!token) {
      console.log('[Dashboard] No token yet, skipping fetch');
      return;
    }
    try {
      if (isManualRefresh) setRefreshing(true);
      else if (classesList.length === 0) setLoading(true);

      console.log('[Dashboard] Fetching from:', API_URL);

      const authHeader = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [oRes, cRes, tRes] = await Promise.all([
        fetch(`${API_URL}/admin/get_overview.php`, { headers: authHeader }),
        fetch(`${API_URL}/admin/manage_classes.php`, { headers: authHeader }),
        fetch(`${API_URL}/admin/manage_teachers.php`, { headers: authHeader }),
      ]);

      console.log('[Dashboard] overview status:', oRes.status);
      console.log('[Dashboard] classes status:', cRes.status);
      console.log('[Dashboard] teachers status:', tRes.status);

      const oText = await oRes.text();
      console.log('[Dashboard] overview raw:', oText);
      const oData = JSON.parse(oText);
      if (oData && oData.metrics) {
        setMetrics(oData.metrics);
      } else {
        console.log('[Dashboard] No metrics key in response:', oData);
      }

      const cText = await cRes.text();
      console.log('[Dashboard] classes raw:', cText.substring(0, 200));
      const cData = JSON.parse(cText);
      if (Array.isArray(cData)) setClassesList(cData);

      const tText = await tRes.text();
      const tData = JSON.parse(tText);
      if (Array.isArray(tData)) setTeachersList(tData);

    } catch (err) {
      console.log('[Dashboard] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch every time this screen comes into focus AND whenever token changes
  useFocusEffect(
    useCallback(() => {
      fetchOverview();
    }, [token])
  );

  const handleDeleteClass = (classObj) => {
    Alert.alert(
      'Delete Class Stream',
      `Are you sure you want to delete ${classObj.class_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/admin/manage_classes.php?id=${classObj.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert('Deleted', 'Class stream removed successfully.');
                fetchOverview();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete class.');
              }
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      Alert.alert('Validation Error', 'Please enter a class stream name.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        class_name: className.trim(),
        class_level: classLevel.trim(),
        academic_year: academicYear.trim(),
        teacher_id: selectedTeacher ? selectedTeacher.teacher_id : null,
      };

      const response = await fetch(`${API_URL}/admin/manage_classes.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create class');
      }

      Alert.alert('Class Created', `Ugandan secondary stream "${className}" created successfully!`);
      setModalVisible(false);
      setClassName('');
      setSelectedTeacher(null);
      fetchOverview();
    } catch (err) {
      Alert.alert('Creation Error', err.message || 'Failed to create class stream.');
    } finally {
      setSubmitting(false);
    }
  };

  const [expandedClassId, setExpandedClassId] = useState(null);

  const toggleExpandClass = (id) => {
    setExpandedClassId((prev) => (prev === id ? null : id));
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchOverview(true)} tintColor="#14B8A6" />
      }
    >
      <View style={styles.container}>
        <ThemedView type="backgroundElement" style={[styles.heroCard, { borderColor: '#14B8A633', borderWidth: 1 }]}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: '#14B8A6', fontWeight: 'bold' }}>LOG CONTROL CENTRE</ThemedText>
              <ThemedText type="subtitle" style={styles.adminName}>{user?.full_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statusTag}>
                Role: System Administrator (Active)
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <TouchableOpacity
                onPress={() => setShowProfileModal(true)}
                style={[styles.logoutButton, { backgroundColor: theme.backgroundSelected }]}
                activeOpacity={0.7}
              >
                <SymbolView tintColor="#8B5CF6" name="person.crop.circle" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowNotifModal(true)}
                style={[styles.logoutButton, { backgroundColor: theme.backgroundSelected, position: 'relative' }]}
                activeOpacity={0.7}
              >
                <SymbolView tintColor="#14B8A6" name="bell.fill" size={20} />
                {unreadCounts?.total_unread > 0 && (
                  <View style={{
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
                  }}>
                    <ThemedText style={{ color: '#ffffff', fontSize: 10, fontWeight: '800', textAlign: 'center', includeFontPadding: false }}>
                      {unreadCounts.total_unread}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                <SymbolView tintColor="#FF3B30" name="power" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>

        <NotificationCenterModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />
        <ProfileEditModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />

        {/* Admin Management & Rapid Action Tools */}
        <QuickActionGrid
          sectionTitle="Rapid Administration Tools"
          sectionIcon="shield.fill"
          items={[
            {
              title: 'Student Roster',
              icon: 'graduationcap.fill',
              color: '#5383EC',
              onPress: () => router.push('/(admin)/students'),
            },
            {
              title: 'Staff Directory',
              icon: 'person.badge.key',
              color: '#8B5CF6',
              onPress: () => router.push('/(admin)/teachers'),
            },
            {
              title: 'Parent Portal',
              icon: 'person.2.fill',
              color: '#FF9500',
              onPress: () => router.push('/(admin)/parents'),
            },
            {
              title: 'Post Bulletin',
              icon: 'megaphone.fill',
              color: '#14B8A6',
              onPress: () => router.push('/(admin)/notifications'),
            },
            {
              title: 'Create Stream',
              icon: 'plus.circle.fill',
              color: '#34C759',
              onPress: () => setModalVisible(true),
            },
            {
              title: 'System Notices',
              icon: 'bell.fill',
              color: '#FF3B30',
              badgeText: unreadCounts?.total_unread > 0 ? `${unreadCounts.total_unread}` : null,
              onPress: () => setShowNotifModal(true),
            },
          ]}
        />

        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1, paddingRight: Spacing.two }}>
            <ThemedText type="smallBold" style={[styles.sectionHeader, { color: '#14B8A6' }]} numberOfLines={1}>
              SYSTEM METRICS (LIVE DATABASE)
            </ThemedText>
          </View>
          <TouchableOpacity style={[styles.createClassBtn, { backgroundColor: '#14B8A6' }]} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <SymbolView tintColor="#ffffff" name="plus.circle.fill" size={14} />
            <ThemedText style={styles.createClassBtnText}>New Stream</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <CustomLoader message="Syncing system metrics..." />
        ) : (
          <>
            <View style={styles.grid}>
              <ThemedView type="backgroundElement" style={[styles.gridCard, { borderColor: '#14B8A633', borderWidth: 1 }]}>
                <SymbolView tintColor="#14B8A6" name="rectangle.3.group.fill" size={22} />
                <ThemedText type="title" style={{ color: '#14B8A6' }}>{metrics.total_classes}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Classes</ThemedText>
              </ThemedView>

              <ThemedView type="backgroundElement" style={[styles.gridCard, { borderColor: '#8B5CF633', borderWidth: 1 }]}>
                <SymbolView tintColor="#8B5CF6" name="person.badge.key" size={22} />
                <ThemedText type="title" style={{ color: '#8B5CF6' }}>{metrics.total_teachers}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Teachers</ThemedText>
              </ThemedView>
            </View>

            <View style={styles.grid}>
              <ThemedView type="backgroundElement" style={[styles.gridCard, { borderColor: '#F59E0B33', borderWidth: 1 }]}>
                <SymbolView tintColor="#F59E0B" name="person.2.fill" size={22} />
                <ThemedText type="title" style={{ color: '#F59E0B' }}>{metrics.total_parents}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Parents</ThemedText>
              </ThemedView>

              <ThemedView type="backgroundElement" style={[styles.gridCard, { borderColor: '#3B82F633', borderWidth: 1 }]}>
                <SymbolView tintColor="#3B82F6" name="graduationcap.fill" size={22} />
                <ThemedText type="title" style={{ color: '#3B82F6' }}>{metrics.total_students}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Students</ThemedText>
              </ThemedView>
            </View>
          </>
        )}

        <ThemedText type="smallBold" style={[styles.sectionHeader, { color: '#8B5CF6' }]}>REGISTERED CLASS STREAMS (CLICK TO OPEN)</ThemedText>
        
        {classesList.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.alertCard}>
            <ThemedText type="small" themeColor="textSecondary">No classes registered. Tap "+ New Stream" above.</ThemedText>
          </ThemedView>
        ) : (
          classesList.map((c) => {
            const isExpanded = expandedClassId === c.id;
            return (
              <ThemedView key={c.id} type="backgroundElement" style={[styles.classCard, { borderColor: isExpanded ? '#14B8A6' : '#e2e8f01a' }]}>
                <TouchableOpacity onPress={() => toggleExpandClass(c.id)} activeOpacity={0.7} style={styles.classRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ fontSize: 15 }}>{c.class_name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {c.grade_level ? `Level: Grade ${c.grade_level}` : 'Secondary Stream'}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.studentBadge, { backgroundColor: '#14B8A622' }]}>
                      <ThemedText style={[styles.studentBadgeText, { color: '#14B8A6' }]}>{c.student_count} Students</ThemedText>
                    </View>
                    <SymbolView tintColor={isExpanded ? '#14B8A6' : theme.textSecondary} name={isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill"} size={22} />
                  </View>
                </TouchableOpacity>

                {/* Collapsible Accordion Content */}
                {isExpanded && (
                  <View style={{ marginTop: Spacing.two, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: '#e2e8f01a', gap: Spacing.two }}>
                    <ThemedText type="small">👨‍🏫 <ThemedText type="smallBold">Homeroom Teacher:</ThemedText> {c.teacher_name || 'Unassigned'}</ThemedText>
                    <ThemedText type="small">🎓 <ThemedText type="smallBold">Academic Stream:</ThemedText> {c.class_level || 'Secondary Level'}</ThemedText>
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleDeleteClass(c)}
                        style={{ flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#FF3B3055', backgroundColor: '#FF3B3022', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                        activeOpacity={0.75}
                      >
                        <SymbolView tintColor="#FF3B30" name="trash.fill" size={16} />
                        <ThemedText style={{ color: '#FF3B30', fontSize: 13, fontWeight: 'bold' }}>Remove Class Stream</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ThemedView>
            );
          })
        )}

        <ThemedText type="smallBold" style={[styles.sectionHeader, { color: '#14B8A6' }]}>SYSTEM ALERTS</ThemedText>

        <ThemedView type="backgroundElement" style={[styles.alertCard, { borderColor: '#14B8A633', borderWidth: 1 }]}>
          <SymbolView tintColor="#14B8A6" name="checkmark.shield.fill" size={18} />
          <View style={styles.alertText}>
            <ThemedText type="smallBold" style={{ color: '#14B8A6' }}>Ugandan Secondary System Active</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">O'Level (S1-S4) & A'Level (S5-S6) live database configuration operational.</ThemedText>
          </View>
        </ThemedView>
      </View>

      {/* Create Class Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Create Secondary Class Stream</ThemedText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
                <ThemedText style={styles.label}>Select Education Level</ThemedText>
                <View style={styles.chipsWrap}>
                  {["O'Level (S1-S4)", "A'Level (S5-S6)"].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() => setClassLevel(lvl)}
                      style={[
                        styles.chip,
                        { backgroundColor: classLevel === lvl ? '#14B8A6' : theme.backgroundSelected }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: classLevel === lvl ? '#ffffff' : theme.text }}>
                        {lvl}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.label}>Quick Presets (Tap to select)</ThemedText>
                <View style={styles.chipsWrap}>
                  {ugandanPresets.map((p) => (
                    <TouchableOpacity
                      key={p.label}
                      onPress={() => {
                        setClassName(p.label);
                        setClassLevel(p.level);
                      }}
                      style={[
                        styles.chip,
                        { backgroundColor: className === p.label ? '#34C759' : theme.backgroundSelected }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: className === p.label ? '#ffffff' : theme.text }}>
                        {p.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.label}>Class Stream Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="e.g. Senior 1 Blue, Senior 4 Science, Senior 5 PCM"
                  placeholderTextColor={theme.textSecondary}
                  value={className}
                  onChangeText={setClassName}
                />

                <ThemedText style={styles.label}>Academic Year</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="2026"
                  placeholderTextColor={theme.textSecondary}
                  value={academicYear}
                  onChangeText={setAcademicYear}
                />

                <ThemedText style={styles.label}>Assign Homeroom Teacher</ThemedText>
                <View style={styles.chipsWrap}>
                  {teachersList.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">No teachers registered yet.</ThemedText>
                  ) : teachersList.map((t) => (
                    <TouchableOpacity
                      key={t.teacher_id}
                      onPress={() => setSelectedTeacher(t)}
                      style={[
                        styles.chip,
                        { backgroundColor: selectedTeacher?.teacher_id === t.teacher_id ? '#FF9500' : theme.backgroundSelected }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: selectedTeacher?.teacher_id === t.teacher_id ? '#ffffff' : theme.text }}>
                        {t.full_name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateClass} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <SymbolView tintColor="#ffffff" name="checkmark.circle.fill" size={16} />
                      <ThemedText style={styles.submitBtnText}>Create Class Stream</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </ThemedView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminName: {
    fontWeight: 'bold',
  },
  statusTag: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    padding: Spacing.two,
    borderRadius: 50,
    backgroundColor: '#FF3B301A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
    width: '100%',
  },
  sectionHeader: {
    letterSpacing: 1.2,
  },
  createClassBtn: {
    backgroundColor: '#14B8A6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 0,
  },
  createClassBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  classCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentBadge: {
    backgroundColor: '#14B8A622',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentBadgeText: {
    color: '#14B8A6',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertCard: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#34C7591A',
  },
  alertText: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  modalForm: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: Spacing.one,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  submitBtn: {
    backgroundColor: '#14B8A6',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

