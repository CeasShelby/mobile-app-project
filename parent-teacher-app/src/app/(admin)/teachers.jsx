import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, Alert, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function ManageTeachersScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [specialization, setSpecialization] = useState('Mathematics & Physics');
  const [selectedClassIds, setSelectedClassIds] = useState([]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/manage_teachers.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setTeachers(data);
        }
      }
    } catch (err) {
      console.log('Failed to fetch teachers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/manage_classes.php`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setClasses(data);
        }
      }
    } catch (err) {
      console.log('Failed to fetch classes:', err.message);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
  }, [token]);

  const toggleClassSelection = (classId) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
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
        data={teachers}
        keyExtractor={(item) => item.teacher_id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View>
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
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText type="smallBold">{item.full_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{item.email}</ThemedText>
              </View>
              <View style={styles.statusBadge}>
                <ThemedText style={styles.statusText}>{item.status}</ThemedText>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.details}>
              <ThemedText type="small">Emp No: {item.employee_number}</ThemedText>
              <ThemedText type="small">Specialization: {item.specialization}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Assigned Streams: {item.assigned_classes || 'None assigned yet'}
              </ThemedText>
            </View>
          </ThemedView>
        )}
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
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Register New Teacher</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {classes.map((c) => {
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
              </ScrollView>

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

