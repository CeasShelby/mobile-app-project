import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function AdminDashboard() {
  const { user, token, logout } = useContext(AuthContext);
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
  const [modalVisible, setModalVisible] = useState(false);
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

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [oRes, cRes, tRes] = await Promise.all([
        fetch(`${API_URL}/admin/get_overview.php`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/manage_classes.php`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/manage_teachers.php`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.metrics) setMetrics(oData.metrics);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData)) setClassesList(cData);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) setTeachersList(tData);
      }
    } catch (err) {
      console.log('Failed to fetch admin overview:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [token]);

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

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">Log Control Centre</ThemedText>
              <ThemedText type="subtitle" style={styles.adminName}>{user?.full_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statusTag}>
                Status: System Administrator (Active)
              </ThemedText>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <SymbolView tintColor="#FF3B30" name="power" size={20} />
            </TouchableOpacity>
          </View>
        </ThemedView>

        <View style={styles.sectionHeaderRow}>
          <ThemedText type="smallBold" style={styles.sectionHeader}>SYSTEM METRICS (LIVE DATABASE)</ThemedText>
          <TouchableOpacity style={styles.createClassBtn} onPress={() => setModalVisible(true)}>
            <SymbolView tintColor="#ffffff" name="plus.circle.fill" size={14} />
            <ThemedText style={styles.createClassBtnText}>New Stream</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#208AEF" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.grid}>
              <ThemedView type="backgroundElement" style={styles.gridCard}>
                <SymbolView tintColor="#208AEF" name="rectangle.3.group.fill" size={20} />
                <ThemedText type="title">{metrics.total_classes}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Classes</ThemedText>
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.gridCard}>
                <SymbolView tintColor="#34C759" name="person.badge.key" size={20} />
                <ThemedText type="title">{metrics.total_teachers}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Teachers</ThemedText>
              </ThemedView>
            </View>

            <View style={styles.grid}>
              <ThemedView type="backgroundElement" style={styles.gridCard}>
                <SymbolView tintColor="#FF9500" name="person.2.fill" size={20} />
                <ThemedText type="title">{metrics.total_parents}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Parents</ThemedText>
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.gridCard}>
                <SymbolView tintColor="#5856D6" name="graduationcap.fill" size={20} />
                <ThemedText type="title">{metrics.total_students}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Students</ThemedText>
              </ThemedView>
            </View>
          </>
        )}

        <ThemedText type="smallBold" style={styles.sectionHeader}>REGISTERED CLASS STREAMS (S1 - S6)</ThemedText>
        
        {classesList.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.alertCard}>
            <ThemedText type="small" themeColor="textSecondary">No classes registered. Tap "+ New Stream" above.</ThemedText>
          </ThemedView>
        ) : (
          classesList.map((c) => (
            <ThemedView key={c.id} type="backgroundElement" style={styles.classCard}>
              <View style={styles.classRow}>
                <View>
                  <ThemedText type="smallBold">{c.class_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Level: {c.class_level || 'Secondary'} • Teacher: {c.teacher_name || 'Unassigned'}
                  </ThemedText>
                </View>
                <View style={styles.studentBadge}>
                  <ThemedText style={styles.studentBadgeText}>{c.student_count} Students</ThemedText>
                </View>
              </View>
            </ThemedView>
          ))
        )}

        <ThemedText type="smallBold" style={styles.sectionHeader}>SYSTEM ALERTS</ThemedText>

        <ThemedView type="backgroundElement" style={styles.alertCard}>
          <SymbolView tintColor="#34C759" name="checkmark.shield.fill" size={16} />
          <View style={styles.alertText}>
            <ThemedText type="smallBold">Ugandan Secondary System Active</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">O'Level (S1-S4) & A'Level (S5-S6) live database configuration operational.</ThemedText>
          </View>
        </ThemedView>
      </View>

      {/* Create Class Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Create Secondary Class Stream</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <ThemedText style={styles.label}>Select Education Level</ThemedText>
              <View style={styles.chipsRow}>
                {["O'Level (S1-S4)", "A'Level (S5-S6)"].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setClassLevel(lvl)}
                    style={[
                      styles.chip,
                      { backgroundColor: classLevel === lvl ? '#208AEF' : theme.backgroundSelected }
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: classLevel === lvl ? '#ffffff' : theme.text }}>
                      {lvl}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Quick Presets (Tap to select)</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
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
              </ScrollView>

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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {teachersList.map((t) => (
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
              </ScrollView>

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
  },
  sectionHeader: {
    letterSpacing: 1.2,
  },
  createClassBtn: {
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 20,
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
    backgroundColor: '#208AEF22',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentBadgeText: {
    color: '#208AEF',
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
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  submitBtn: {
    backgroundColor: '#208AEF',
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

