import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, Alert, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function ManageParentsScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [occupation, setOccupation] = useState('Guardian / Parent');
  const [address, setAddress] = useState('Springfield, Main Street');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const fetchParents = async () => {
    try {
      setLoading(true);
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
        data={parents}
        keyExtractor={(item) => item.parent_id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View>
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
              <ThemedText type="small">Occupation: {item.occupation || 'N/A'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Children Enrolled: {item.children_names || 'No children linked yet'}
              </ThemedText>
            </View>
          </ThemedView>
        )}
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
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Register New Parent</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <SymbolView tintColor="#FF3B30" name="xmark.circle.fill" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
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

