import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, FlatList, ActivityIndicator, View, Alert,
  TouchableOpacity, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';
import { CustomLoader } from '@/components/CustomLoader';
import { ActionMenuModal } from '@/components/ActionMenuModal';

export default function ManageStudentsScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [students, setStudents]   = useState([]);
  const [classes, setClasses]     = useState([]);
  const [parents, setParents]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const toggleExpandStudent = (id) => {
    setExpandedStudentId((prev) => (prev === id ? null : id));
  };

  // Register modal state
  const [registerModal, setRegisterModal] = useState(false);
  const [fullName, setFullName]           = useState('');
  const [gender, setGender]               = useState('Male');
  const [selectedClass, setSelectedClass] = useState(null);
  const [customClass, setCustomClass]     = useState('');
  const [combination, setCombination]     = useState('');
  const [selectedParent, setSelectedParent] = useState(null);

  // Edit student modal state
  const [editModal, setEditModal]         = useState(false);
  const [editStudent, setEditStudent]     = useState(null);
  const [editName, setEditName]           = useState('');
  const [editGender, setEditGender]       = useState('Male');
  const [editClass, setEditClass]         = useState(null);
  const [editCustomClass, setEditCustomClass] = useState('');
  const [editCombination, setEditCombination] = useState('');

  // Inline "Register New Parent" inside student form
  const [showNewParentForm, setShowNewParentForm] = useState(false);
  const [newParentName, setNewParentName]         = useState('');
  const [newParentEmail, setNewParentEmail]       = useState('');
  const [newParentPassword, setNewParentPassword] = useState('password123');

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchAll = async () => {
    try {
      if (students.length === 0) setLoading(true);
      const [sRes, cRes, pRes] = await Promise.all([
        fetch(`${API_URL}/admin/manage_students.php`, { headers: authHeaders }),
        fetch(`${API_URL}/admin/manage_classes.php`,  { headers: authHeaders }),
        fetch(`${API_URL}/admin/manage_parents.php`,  { headers: authHeaders }),
      ]);
      if (sRes.ok) { const d = await sRes.json(); if (Array.isArray(d)) setStudents(d); }
      if (cRes.ok) { const d = await cRes.json(); if (Array.isArray(d)) setClasses(d); }
      if (pRes.ok) { const d = await pRes.json(); if (Array.isArray(d)) setParents(d); }
    } catch (err) {
      console.log('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [token]);

  const handleDeleteStudent = (student) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to permanently delete ${student.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/admin/manage_students.php?id=${student.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert('Deleted', 'Student record removed successfully.');
                fetchAll();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete student.');
              }
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // ─── Register New Parent inline ─────────────────────────────────────────────
  const handleRegisterNewParent = async () => {
    if (!newParentName.trim() || !newParentEmail.trim()) {
      Alert.alert('Validation', 'Parent name and email are required.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/admin/manage_parents.php`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          full_name: newParentName.trim(),
          email:     newParentEmail.trim(),
          password:  newParentPassword.trim() || 'password123',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create parent');

      Alert.alert('✅ Parent Created', `${newParentName} was registered. Refreshing parent list...`);
      setShowNewParentForm(false);
      setNewParentName(''); setNewParentEmail(''); setNewParentPassword('password123');

      // Refresh parent list and auto-select the newly created parent
      const pRes = await fetch(`${API_URL}/admin/manage_parents.php`, { headers: authHeaders });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) {
          setParents(pData);
          const newP = pData.find(p => p.email === newParentEmail.trim());
          if (newP) setSelectedParent(newP);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Register Student ────────────────────────────────────────────────────────
  const handleRegisterStudent = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter student full name.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/admin/manage_students.php`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          full_name:          fullName.trim(),
          gender,
          class_id:           selectedClass ? selectedClass.id : null,
          custom_class_name:  customClass.trim() || null,
          combination:        combination.trim() || null,
          parent_user_id:     selectedParent ? selectedParent.user_id : null,
          date_of_birth:      '2010-01-01',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register student');

      Alert.alert('✅ Student Enrolled', `${fullName} registered with ID ${data.admission_number}`);
      setRegisterModal(false);
      setFullName(''); setCustomClass(''); setCombination(''); setSelectedClass(null); setSelectedParent(null); setGender('Male');
      fetchAll();
    } catch (err) {
      Alert.alert('Registration Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Open Edit Modal ─────────────────────────────────────────────────────────
  const openEditModal = (student) => {
    setEditStudent(student);
    setEditName(student.full_name || '');
    setEditGender(student.gender || 'Male');
    setEditClass(classes.find(c => c.id === student.class_id) || null);
    setEditCombination(student.combination || '');
    setEditCustomClass('');
    setEditModal(true);
  };

  // ─── Save Edit ───────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editName.trim()) { Alert.alert('Validation', 'Name cannot be empty.'); return; }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/admin/manage_students.php`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          id:                 editStudent.id,
          full_name:          editName.trim(),
          gender:             editGender,
          class_id:           editClass ? editClass.id : null,
          custom_class_name:  editCustomClass.trim() || null,
          combination:        editCombination.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      Alert.alert('✅ Updated', 'Student information saved.');
      setEditModal(false);
      fetchAll();
    } catch (err) {
      Alert.alert('Update Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && students.length === 0) {
    return <CustomLoader fullScreen message="Loading student database..." />;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={students}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1, paddingRight: Spacing.two }}>
                <ThemedText type="subtitle">Student Directory</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => setRegisterModal(true)}>
                <SymbolView tintColor="#ffffff" name="person.badge.plus" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedStudentId === item.id;
          return (
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: isExpanded ? '#14B8A6' : '#e2e8f01a' }]}>
              <TouchableOpacity onPress={() => toggleExpandStudent(item.id)} activeOpacity={0.7} style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={{ fontSize: 15 }}>{item.full_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.admission_number} · {item.gender} · Parent: {item.parent_names || 'None'}
                  </ThemedText>
                  {item.combination ? (
                    <ThemedText type="small" style={{ color: '#8B5CF6', marginTop: 2, fontWeight: '600' }}>
                      📘 Combination / Track: {item.combination}
                    </ThemedText>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <View style={styles.classBadge}>
                    <ThemedText style={styles.classText}>{item.class_name || 'Unassigned'}</ThemedText>
                  </View>
                  <SymbolView tintColor={isExpanded ? '#14B8A6' : theme.textSecondary} name={isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill"} size={22} />
                </View>
              </TouchableOpacity>

              {/* Inline Expandable Action Bar */}
              {isExpanded && (
                <View style={styles.expandedDrawer}>
                  <View style={styles.expandedActionRow}>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      style={[styles.expandedBtn, { backgroundColor: '#14B8A622', borderColor: '#14B8A655' }]}
                      activeOpacity={0.75}
                    >
                      <SymbolView tintColor="#14B8A6" name="square.and.pencil" size={16} />
                      <ThemedText style={[styles.expandedBtnText, { color: '#14B8A6' }]}>Edit Student</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteStudent(item)}
                      style={[styles.expandedBtn, { backgroundColor: '#FF3B3022', borderColor: '#FF3B3055' }]}
                      activeOpacity={0.75}
                    >
                      <SymbolView tintColor="#FF3B30" name="trash.fill" size={16} />
                      <ThemedText style={[styles.expandedBtnText, { color: '#FF3B30' }]}>Delete Record</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ThemedView>
          );
        }}
        ListEmptyComponent={
          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <SymbolView tintColor={theme.textSecondary} name="person.slash" size={32} />
            <ThemedText type="smallBold">No Students Enrolled Yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Tap + to register the first student.</ThemedText>
          </ThemedView>
        }
      />

      {/* ── Register Student Modal ── */}
      <Modal visible={registerModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Register New Student</ThemedText>
              <TouchableOpacity onPress={() => { setRegisterModal(false); setShowNewParentForm(false); }}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.label}>STUDENT FULL NAME</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. John Doe"
                placeholderTextColor={theme.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />

              <ThemedText style={styles.label}>GENDER</ThemedText>
              <View style={styles.chipsRow}>
                {['Male', 'Female'].map(g => (
                  <TouchableOpacity key={g} onPress={() => setGender(g)}
                    style={[styles.chip, { backgroundColor: gender === g ? '#14B8A6' : theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ color: gender === g ? '#fff' : theme.text }}>{g}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>ASSIGN PREDEFINED CLASS STREAM</ThemedText>
              <View style={styles.chipsWrap}>
                {classes.length === 0
                  ? <ThemedText type="small" themeColor="textSecondary">No classes yet. Enter custom class below.</ThemedText>
                  : classes.map(c => (
                    <TouchableOpacity key={c.id} onPress={() => {
                      if (selectedClass?.id === c.id) {
                        setSelectedClass(null);
                      } else {
                        setSelectedClass(c);
                        setCustomClass('');
                      }
                    }}
                      style={[styles.chip, { backgroundColor: selectedClass?.id === c.id ? '#34C759' : theme.backgroundSelected }]}>
                      <ThemedText type="smallBold" style={{ color: selectedClass?.id === c.id ? '#fff' : theme.text }}>{c.class_name}</ThemedText>
                    </TouchableOpacity>
                  ))}
              </View>

              <ThemedText style={styles.label}>OR TYPE CUSTOM CLASS / STREAM</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. Senior 5 Science, Senior 6 Arts"
                placeholderTextColor={theme.textSecondary}
                value={customClass}
                onChangeText={(text) => {
                  setCustomClass(text);
                  if (text) setSelectedClass(null);
                }}
              />

              <ThemedText style={styles.label}>SUBJECT COMBINATION / TRACK (e.g. FOR A'LEVEL)</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. PCM/ICT, BCM/SubMath, HEG, Technical, etc."
                placeholderTextColor={theme.textSecondary}
                value={combination}
                onChangeText={setCombination}
              />

              {/* Parent Section */}
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.label}>LINK PARENT ACCOUNT</ThemedText>
                <TouchableOpacity onPress={() => setShowNewParentForm(!showNewParentForm)}
                  style={styles.newParentBtn}>
                  <SymbolView tintColor="#FF9500" name={showNewParentForm ? 'minus.circle' : 'plus.circle'} size={16} />
                  <ThemedText style={styles.newParentBtnText}>
                    {showNewParentForm ? 'Cancel' : 'Register New Parent'}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {showNewParentForm ? (
                <ThemedView type="backgroundElement" style={styles.inlineForm}>
                  <ThemedText type="smallBold" style={{ marginBottom: Spacing.two, color: '#FF9500' }}>
                    📝 New Parent Registration
                  </ThemedText>
                  <TextInput style={[styles.input, { color: theme.text, borderColor: '#FF9500' }]}
                    placeholder="Parent Full Name" placeholderTextColor={theme.textSecondary}
                    value={newParentName} onChangeText={setNewParentName} />
                  <TextInput style={[styles.input, { color: theme.text, borderColor: '#FF9500', marginTop: Spacing.two }]}
                    placeholder="Parent Email Address" placeholderTextColor={theme.textSecondary}
                    value={newParentEmail} onChangeText={setNewParentEmail} keyboardType="email-address" autoCapitalize="none" />
                  <TextInput style={[styles.input, { color: theme.text, borderColor: '#FF9500', marginTop: Spacing.two }]}
                    placeholder="Temporary Password" placeholderTextColor={theme.textSecondary}
                    value={newParentPassword} onChangeText={setNewParentPassword} secureTextEntry />
                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FF9500', marginTop: Spacing.two }]}
                    onPress={handleRegisterNewParent} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : (
                      <ThemedText style={styles.submitBtnText}>Create Parent Account</ThemedText>
                    )}
                  </TouchableOpacity>
                </ThemedView>
              ) : (
                <View style={styles.chipsWrap}>
                  {parents.length === 0
                    ? <ThemedText type="small" themeColor="textSecondary">No parents registered. Use "Register New Parent" above.</ThemedText>
                    : parents.map(p => (
                      <TouchableOpacity key={p.parent_id} onPress={() => setSelectedParent(selectedParent?.parent_id === p.parent_id ? null : p)}
                        style={[styles.chip, { backgroundColor: selectedParent?.parent_id === p.parent_id ? '#FF9500' : theme.backgroundSelected }]}>
                        <ThemedText type="smallBold" style={{ color: selectedParent?.parent_id === p.parent_id ? '#fff' : theme.text }}>{p.full_name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleRegisterStudent} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <SymbolView tintColor="#fff" name="checkmark.circle.fill" size={16} />
                    <ThemedText style={styles.submitBtnText}>Enrol Student</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Student Modal ── */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Edit Student</ThemedText>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.label}>FULL NAME</ThemedText>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                value={editName} onChangeText={setEditName} />

              <ThemedText style={styles.label}>GENDER</ThemedText>
              <View style={styles.chipsRow}>
                {['Male', 'Female'].map(g => (
                  <TouchableOpacity key={g} onPress={() => setEditGender(g)}
                    style={[styles.chip, { backgroundColor: editGender === g ? '#14B8A6' : theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ color: editGender === g ? '#fff' : theme.text }}>{g}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>CLASS STREAM</ThemedText>
              <View style={styles.chipsWrap}>
                <TouchableOpacity onPress={() => { setEditClass(null); }}
                  style={[styles.chip, { backgroundColor: (!editClass && !editCustomClass) ? '#8E8E93' : theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" style={{ color: (!editClass && !editCustomClass) ? '#fff' : theme.text }}>Unassigned</ThemedText>
                </TouchableOpacity>
                {classes.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => { setEditClass(c); setEditCustomClass(''); }}
                    style={[styles.chip, { backgroundColor: editClass?.id === c.id ? '#34C759' : theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ color: editClass?.id === c.id ? '#fff' : theme.text }}>{c.class_name}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>OR TYPE NEW / CUSTOM CLASS STREAM</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. Senior 5 PCM, Senior 6 HEG"
                placeholderTextColor={theme.textSecondary}
                value={editCustomClass}
                onChangeText={(text) => {
                  setEditCustomClass(text);
                  if (text) setEditClass(null);
                }}
              />

              <ThemedText style={styles.label}>SUBJECT COMBINATION / TRACK (e.g. FOR A'LEVEL)</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. PCM/ICT, BCM/SubMath, HEG, Technical, etc."
                placeholderTextColor={theme.textSecondary}
                value={editCombination}
                onChangeText={setEditCombination}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <SymbolView tintColor="#fff" name="checkmark.circle.fill" size={16} />
                    <ThemedText style={styles.submitBtnText}>Save Changes</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  listContent: { padding: Spacing.three, gap: Spacing.two },
  header: { marginBottom: Spacing.two },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  addButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  card: { padding: Spacing.three, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f01a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandedDrawer: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f01a',
  },
  expandedActionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  expandedBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  expandedBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  classBadge: {
    backgroundColor: '#14B8A622', paddingHorizontal: Spacing.two,
    paddingVertical: 4, borderRadius: 8,
  },
  classText: { color: '#14B8A6', fontSize: 11, fontWeight: 'bold' },
  editBtn: { padding: 2 },
  emptyCard: { padding: Spacing.six, borderRadius: 16, alignItems: 'center', gap: Spacing.one },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalContainer: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.four, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.two,
  },
  modalForm: { gap: Spacing.two, paddingBottom: Spacing.four },
  label: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: Spacing.one },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.three, fontSize: 14 },
  chipsRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.half },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingVertical: Spacing.half },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one },
  newParentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newParentBtnText: { color: '#FF9500', fontSize: 12, fontWeight: 'bold' },
  inlineForm: { padding: Spacing.three, borderRadius: 12, borderWidth: 1, borderColor: '#FF950033' },
  submitBtn: {
    backgroundColor: '#34C759', height: 50, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three,
  },
  submitBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
