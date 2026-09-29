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

export default function ManageParentsScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [parents, setParents]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [expandedParentId, setExpandedParentId] = useState(null);

  const toggleExpandParent = (id) => {
    setExpandedParentId((prev) => (prev === id ? null : id));
  };

  // Register form state
  const [fullName, setFullName]         = useState('');
  const [email, setEmail]               = useState('');
  const [phone, setPhone]               = useState('');
  const [password, setPassword]         = useState('password123');
  const [occupation, setOccupation]     = useState('Guardian / Parent');
  const [address, setAddress]           = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Edit modal state
  const [editModal, setEditModal]       = useState(false);
  const [editParent, setEditParent]     = useState(null);
  const [editName, setEditName]         = useState('');
  const [editPhone, setEditPhone]       = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editAddress, setEditAddress]   = useState('');

  const fetchParents = async () => {
    try {
      if (parents.length === 0) setLoading(true);
      const response = await fetch(`${API_URL}/admin/manage_parents.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setParents(data);
        }
      }
    } catch (err) {
      console.log('Failed to fetch parents:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/manage_students.php`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setStudents(data);
        }
      }
    } catch (err) {
      console.log('Failed to fetch students:', err.message);
    }
  };

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, [token]);

  const toggleStudentSelection = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const openEditModal = (parent) => {
    setEditParent(parent);
    setEditName(parent.full_name || '');
    setEditPhone(parent.phone || '');
    setEditOccupation(parent.occupation || '');
    setEditAddress(parent.address || '');
    setEditModal(true);
  };

  const handleDeleteParent = (parent) => {
    Alert.alert(
      'Delete Parent',
      `Are you sure you want to delete ${parent.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/admin/manage_parents.php?parent_id=${parent.parent_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert('Deleted', 'Parent account removed successfully.');
                fetchParents();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete parent.');
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
      const res = await fetch(`${API_URL}/admin/manage_parents.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          parent_id:  editParent.parent_id,
          full_name:  editName.trim(),
          phone:      editPhone.trim(),
          occupation: editOccupation.trim(),
          address:    editAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      Alert.alert('✅ Updated', 'Parent profile saved.');
      setEditModal(false);
      fetchParents();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterParent = async () => {
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
        occupation: occupation.trim(),
        address: address.trim(),
        student_ids: selectedStudentIds,
      };

      const response = await fetch(`${API_URL}/admin/manage_parents.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register parent account');
      }

      Alert.alert('Parent Registered', `Parent ${fullName} registered successfully!`);
      setModalVisible(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('password123');
      setOccupation('Guardian / Parent');
      setAddress('Springfield, Main Street');
      setSelectedStudentIds([]);
      fetchParents();
    } catch (err) {
      Alert.alert('Registration Error', err.message || 'Failed to register parent.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && parents.length === 0) {
    return <CustomLoader fullScreen message="Loading parent directory..." />;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={parents}
        keyExtractor={(item) => item.parent_id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1, paddingRight: Spacing.two }}>
                <ThemedText type="subtitle">Parent Directory</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Guardians & linked secondary students ({parents.length} registered).
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                <SymbolView tintColor="#ffffff" name="person.badge.plus" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedParentId === item.parent_id;
          return (
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: isExpanded ? '#14B8A6' : '#e2e8f01a' }]}>
              <TouchableOpacity onPress={() => toggleExpandParent(item.parent_id)} activeOpacity={0.7} style={styles.cardHeader}>
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
                <ThemedText type="small">Phone: {item.phone || 'Not provided'}</ThemedText>
                <ThemedText type="small">Occupation: {item.occupation || 'N/A'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Children Enrolled: {item.children_names || 'No children linked yet'}
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
                      <ThemedText style={[styles.expandedBtnText, { color: '#14B8A6' }]}>Edit Parent</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteParent(item)}
                      style={[styles.expandedBtn, { backgroundColor: '#FF3B3022', borderColor: '#FF3B3055' }]}
                      activeOpacity={0.75}
                    >
                      <SymbolView tintColor="#FF3B30" name="trash.fill" size={16} />
                      <ThemedText style={[styles.expandedBtnText, { color: '#FF3B30' }]}>Delete Account</ThemedText>
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
            <ThemedText type="smallBold">No Parents Registered</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Tap the + button to add parent accounts.</ThemedText>
          </ThemedView>
        }
      />

      {/* Parent Registration Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Register New Parent</ThemedText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
                <ThemedText style={styles.label}>Parent Full Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="e.g. John Doe Sr., Martha Stewart"
                  placeholderTextColor={theme.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                />

                <ThemedText style={styles.label}>Email Address</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="e.g. parent@example.com"
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

                <ThemedText style={styles.label}>Occupation</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="e.g. Engineer, Business Owner, Medical Doctor"
                  placeholderTextColor={theme.textSecondary}
                  value={occupation}
                  onChangeText={setOccupation}
                />

                <ThemedText style={styles.label}>Home Address</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="e.g. 123 Elm Street, Springfield"
                  placeholderTextColor={theme.textSecondary}
                  value={address}
                  onChangeText={setAddress}
                />

                <ThemedText style={styles.label}>Link Enrolled Students (Multi-Select)</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {students.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => toggleStudentSelection(s.id)}
                        style={[
                          styles.chip,
                          { backgroundColor: isSelected ? '#FF9500' : theme.backgroundSelected }
                        ]}
                      >
                        <ThemedText type="smallBold" style={{ color: isSelected ? '#ffffff' : theme.text }}>
                          {s.full_name} ({s.class_name || 'N/A'}) {isSelected ? '✓' : ''}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity style={styles.submitBtn} onPress={handleRegisterParent} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <SymbolView tintColor="#ffffff" name="checkmark.circle.fill" size={16} />
                      <ThemedText style={styles.submitBtnText}>Register Parent</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </ThemedView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Parent Modal ── */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Edit Parent</ThemedText>
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

                <ThemedText style={styles.label}>OCCUPATION</ThemedText>
                <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={editOccupation} onChangeText={setEditOccupation}
                  placeholder="e.g. Engineer, Teacher" placeholderTextColor={theme.textSecondary} />

                <ThemedText style={styles.label}>HOME ADDRESS</ThemedText>
                <TextInput style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={editAddress} onChangeText={setEditAddress}
                  placeholder="e.g. 123 Main St, Kampala" placeholderTextColor={theme.textSecondary} />

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
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  submitBtn: {
    backgroundColor: '#FF9500',
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

