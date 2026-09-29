import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, Alert, TouchableOpacity, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';
import { CustomLoader } from '@/components/CustomLoader';
import { ActionMenuModal } from '@/components/ActionMenuModal';

export default function ManageTeachersScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTeacherId, setExpandedTeacherId] = useState(null);

  const toggleExpandTeacher = (id) => {
    setExpandedTeacherId((prev) => (prev === id ? null : id));
  };

  // Register form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('password123');
  const [specialization, setSpecialization] = useState('Mathematics & Physics');
  const [selectedClassIds, setSelectedClassIds] = useState([]);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editClassIds, setEditClassIds] = useState([]);

  const toggleClassSelection = (cId) => {
    if (selectedClassIds.includes(cId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== cId));
    } else {
      setSelectedClassIds([...selectedClassIds, cId]);
    }
  };

  const toggleEditClassSelection = (cId) => {
    if (editClassIds.includes(cId)) {
      setEditClassIds(editClassIds.filter(id => id !== cId));
    } else {
      setEditClassIds([...editClassIds, cId]);
    }
  };

  const fetchTeachers = async () => {
    try {
      if (teachers.length === 0) setLoading(true);
      const res = await fetch(`${API_URL}/admin/manage_teachers.php`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTeachers(data);
      }
    } catch (err) {
      console.log('Fetch teachers error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/manage_classes.php`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setClasses(data);
      }
    } catch (err) {
      console.log('Fetch classes error:', err.message);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
  }, [token]);

  const openEditModal = (teacher) => {
    setEditTeacher(teacher);
    setEditName(teacher.full_name || '');
    setEditPhone(teacher.phone || '');
    setEditSpecialization(teacher.specialization || '');
    setEditQualification(teacher.qualification || 'Bachelor of Education');

    // Pre-select classes by matching class names in assigned_classes string
    const assignedStr = teacher.assigned_classes || '';
    const initialIds = classes
      .filter(c => assignedStr.toLowerCase().includes(c.class_name.toLowerCase()))
      .map(c => c.id);
    setEditClassIds(initialIds);

    setEditModal(true);
  };

  const handleDeleteTeacher = (teacher) => {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to delete ${teacher.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/admin/manage_teachers.php?teacher_id=${teacher.teacher_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert('Deleted', 'Teacher record removed successfully.');
                fetchTeachers();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete teacher.');
              }
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) { Alert.alert('Validation', 'Name cannot be empty.'); return; }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/admin/manage_teachers.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          teacher_id:     editTeacher.teacher_id,
          full_name:      editName.trim(),
          phone:          editPhone.trim(),
          specialization: editSpecialization.trim(),
          qualification:  editQualification.trim(),
          class_ids:      editClassIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      Alert.alert('✅ Updated', 'Teacher profile and class assignments saved.');
      setEditModal(false);
      fetchTeachers();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterTeacher = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Please fill in full name and email.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        specialization: specialization.trim(),
        class_ids: selectedClassIds,
      };

      const response = await fetch(`${API_URL}/admin/manage_teachers.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register teacher');
      }

      Alert.alert('Teacher Registered', `Teacher ${fullName} registered with Emp No: ${data.employee_number}!`);
      setModalVisible(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('password123');
      setSpecialization('Mathematics & Physics');
      setSelectedClassIds([]);
      fetchTeachers();
    } catch (err) {
      Alert.alert('Registration Error', err.message || 'Failed to register teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && teachers.length === 0) {
    return <CustomLoader fullScreen message="Loading faculty directory..." />;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={teachers}
        keyExtractor={(item) => item.teacher_id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1, paddingRight: Spacing.two }}>
                <ThemedText type="subtitle">Teacher Directory</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Faculty staff & assigned class streams ({teachers.length} registered).
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                <SymbolView tintColor="#ffffff" name="person.badge.plus" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedTeacherId === item.teacher_id;
          return (
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: isExpanded ? '#14B8A6' : '#e2e8f01a' }]}>
              <TouchableOpacity onPress={() => toggleExpandTeacher(item.teacher_id)} activeOpacity={0.7} style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={{ fontSize: 15 }}>{item.full_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{item.email}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <View style={styles.statusBadge}>
                    <ThemedText style={styles.statusText}>{item.status}</ThemedText>
                  </View>
                  <SymbolView tintColor={isExpanded ? '#14B8A6' : theme.textSecondary} name={isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill"} size={22} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <View style={styles.details}>
                <ThemedText type="small">Emp No: {item.employee_number}</ThemedText>
                <ThemedText type="small">Phone: {item.phone || 'Not provided'}</ThemedText>
                <ThemedText type="small">Specialization: {item.specialization}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Assigned Streams: {item.assigned_classes || 'None assigned yet'}
                </ThemedText>
              </View>

              {/* Inline Expandable Action Controls */}
              {isExpanded && (
                <View style={styles.expandedDrawer}>
                  <View style={styles.expandedActionRow}>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      style={[styles.expandedBtn, { backgroundColor: '#14B8A622', borderColor: '#14B8A655' }]}
                      activeOpacity={0.75}
                    >
                      <SymbolView tintColor="#14B8A6" name="square.and.pencil" size={16} />
                      <ThemedText style={[styles.expandedBtnText, { color: '#14B8A6' }]}>Edit Teacher</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteTeacher(item)}
                      style={[styles.expandedBtn, { backgroundColor: '#FF3B3022', borderColor: '#FF3B3055' }]}
                      activeOpacity={0.75}
                    >
                      <SymbolView tintColor="#FF3B30" name="trash.fill" size={16} />
                      <ThemedText style={[styles.expandedBtnText, { color: '#FF3B30' }]}>Remove Faculty</ThemedText>
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
            <ThemedText type="smallBold">No Teachers Registered</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Tap the + button to add faculty teachers.</ThemedText>
          </ThemedView>
        }
      />

      {/* Teacher Registration Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Register New Teacher</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. Sarah Connor, Dr. David Miller"
                placeholderTextColor={theme.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />

              <ThemedText style={styles.label}>Email Address</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. teacher@school.edu"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <ThemedText style={styles.label}>Telephone Number</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. +256 700 000000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <ThemedText style={styles.label}>Initial Password</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <ThemedText style={styles.label}>Subject Specialization</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. Mathematics, Chemistry, English Literature"
                placeholderTextColor={theme.textSecondary}
                value={specialization}
                onChangeText={setSpecialization}
              />

              <ThemedText style={styles.label}>Assign Class Streams (Multi-Select)</ThemedText>
              <View style={styles.chipsWrap}>
                {classes.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">No classes created yet. Create a class first.</ThemedText>
                ) : classes.map((c) => {
                  const isSelected = selectedClassIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => toggleClassSelection(c.id)}
                      style={[
                        styles.chip,
                        { backgroundColor: isSelected ? '#34C759' : theme.backgroundSelected }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: isSelected ? '#ffffff' : theme.text }}>
                        {c.class_name} {isSelected ? '✓' : ''}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleRegisterTeacher} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <SymbolView tintColor="#ffffff" name="checkmark.circle.fill" size={16} />
                    <ThemedText style={styles.submitBtnText}>Register Teacher</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Teacher Modal ── */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Edit Teacher</ThemedText>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.label}>FULL NAME</ThemedText>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                value={editName} onChangeText={setEditName} />

              <ThemedText style={styles.label}>TELEPHONE NUMBER</ThemedText>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                value={editPhone} onChangeText={setEditPhone}
                placeholder="e.g. +256 700 000000" placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad" />

              <ThemedText style={styles.label}>SPECIALIZATION</ThemedText>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                value={editSpecialization} onChangeText={setEditSpecialization}
                placeholder="e.g. Mathematics, Biology" placeholderTextColor={theme.textSecondary} />

              <ThemedText style={styles.label}>QUALIFICATION</ThemedText>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                value={editQualification} onChangeText={setEditQualification}
                placeholder="e.g. Bachelor of Education" placeholderTextColor={theme.textSecondary} />

              <ThemedText style={styles.label}>ASSIGN CLASS STREAMS (Multi-Select)</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {classes.map((cls) => {
                  const isSelected = editClassIds.includes(cls.id);
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      onPress={() => toggleEditClassSelection(cls.id)}
                      style={[
                        styles.chip,
                        { backgroundColor: isSelected ? '#14B8A6' : theme.backgroundSelected }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: isSelected ? '#ffffff' : theme.text }}>
                        {cls.class_name} {isSelected ? '✓' : ''}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <><SymbolView tintColor="#fff" name="checkmark.circle.fill" size={16} />
                  <ThemedText style={styles.submitBtnText}>Save Changes</ThemedText></>
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
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#34C75922',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    color: '#34C759',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f010',
    marginVertical: Spacing.half,
  },
  details: {
    gap: Spacing.half,
  },
  emptyCard: {
    padding: Spacing.six,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.one,
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
    backgroundColor: '#FF3B30',
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

