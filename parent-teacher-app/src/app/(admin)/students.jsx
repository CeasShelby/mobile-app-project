import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, Alert, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function ManageStudentsScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Male');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/manage_students.php`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setStudents(data);
        }
      }
    } catch (err) {
      console.log('Failed to fetch students:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesAndParents = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`${API_URL}/admin/manage_classes.php`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/manage_parents.php`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData)) setClasses(cData);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) setParents(pData);
      }
    } catch (err) {
      console.log('Failed to fetch classes/parents:', err.message);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClassesAndParents();
  }, [token]);

  const handleRegisterStudent = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter student full name.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        full_name: fullName.trim(),
        gender,
        class_id: selectedClass ? selectedClass.id : null,
        parent_user_id: selectedParent ? selectedParent.user_id : null,
        date_of_birth: '2012-05-10',
      };

      const response = await fetch(`${API_URL}/admin/manage_students.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register student');
      }

      Alert.alert('Student Enrolled', `Student ${fullName} registered with ID ${data.admission_number}!`);
      setModalVisible(false);
      setFullName('');
      setSelectedClass(null);
      setSelectedParent(null);
      fetchStudents();
    } catch (err) {
      Alert.alert('Registration Error', err.message || 'Failed to register student.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </ThemedView>
    );
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
              <View>
                <ThemedText type="subtitle">Student Directory</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Secondary school roster ({students.length} students enrolled).
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                <SymbolView tintColor="#ffffff" name="person.badge.plus" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText type="smallBold">{item.full_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Adm No: {item.admission_number} • Parent: {item.parent_names || 'None'}
                </ThemedText>
              </View>
              <View style={styles.classBadge}>
                <ThemedText style={styles.classText}>{item.class_name || 'Unassigned'}</ThemedText>
              </View>
            </View>
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <SymbolView tintColor={theme.textSecondary} name="person.slash" size={32} />
            <ThemedText type="smallBold">No Students Enrolled Yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Tap the + button to register students.</ThemedText>
          </ThemedView>
        }
      />

      {/* Student Registration Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Register New Student</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <ThemedText style={styles.label}>Student Full Name</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="e.g. John Doe, Sarah Smith"
                placeholderTextColor={theme.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />

              <ThemedText style={styles.label}>Gender</ThemedText>
              <View style={styles.chipsRow}>
                {['Male', 'Female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.chip,
                      { backgroundColor: gender === g ? '#208AEF' : theme.backgroundSelected }
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: gender === g ? '#ffffff' : theme.text }}>
                      {g}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Assign Class Stream</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {classes.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedClass(c)}
                    style={[
                      styles.chip,
                      { backgroundColor: selectedClass?.id === c.id ? '#34C759' : theme.backgroundSelected }
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: selectedClass?.id === c.id ? '#ffffff' : theme.text }}>
                      {c.class_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ThemedText style={styles.label}>Link Parent Account</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {parents.map((p) => (
                  <TouchableOpacity
                    key={p.parent_id}
                    onPress={() => setSelectedParent(p)}
                    style={[
                      styles.chip,
                      { backgroundColor: selectedParent?.parent_id === p.parent_id ? '#FF9500' : theme.backgroundSelected }
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: selectedParent?.parent_id === p.parent_id ? '#ffffff' : theme.text }}>
                      {p.full_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={handleRegisterStudent} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <SymbolView tintColor="#ffffff" name="checkmark.circle.fill" size={16} />
                    <ThemedText style={styles.submitBtnText}>Enrol Student</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
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
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
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
  classBadge: {
    backgroundColor: '#208AEF22',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classText: {
    color: '#208AEF',
    fontSize: 11,
    fontWeight: 'bold',
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
    backgroundColor: '#34C759',
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
