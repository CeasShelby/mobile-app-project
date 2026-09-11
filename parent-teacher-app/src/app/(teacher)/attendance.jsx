import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function MarkAttendanceScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // 1. Fetch assigned classes for logged in teacher
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${API_URL}/teacher/get_my_classes.php`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setClasses(data);
            if (data.length > 0) {
              setSelectedClass(data[0]);
            }
          }
        }
      } catch (err) {
        console.log('Failed to fetch assigned classes:', err.message);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [token]);

  // 2. Fetch live student roster when selectedClass changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchRoster = async () => {
      setLoadingStudents(true);
      try {
        const response = await fetch(`${API_URL}/attendance/get_students_by_class.php?class_id=${selectedClass.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            // Map today_status into local student status
            setStudents(data.map(s => ({
              ...s,
              status: s.today_status ? s.today_status.toLowerCase() : 'present',
              remarks: s.today_remarks || '',
            })));
          }
        }
      } catch (err) {
        console.log('Failed to fetch class roster:', err.message);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchRoster();
  }, [selectedClass, token]);

  const updateStatus = (studentId, status) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, status } : student
      )
    );
  };

  const updateRemarks = (studentId, remarks) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, remarks } : student
      )
    );
  };

  const submitAttendance = async (student) => {
    try {
      setSavingId(student.id);
      
      const payload = {
        student_id: student.id,
        class_id: student.class_id,
        attendance_date: new Date().toISOString().substring(0, 10),
        status: student.status,
        remarks: student.remarks || null,
      };

      const response = await fetch(`${API_URL}/attendance/record_attendance.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record attendance');
      }

      Alert.alert('Attendance Saved', `Attendance for ${student.full_name} saved to database!`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save attendance record.');
    } finally {
      setSavingId(null);
    }
  };

  if (loadingClasses) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Class Switcher Bar */}
      <View style={styles.switcherContainer}>
        <ThemedText type="smallBold" style={styles.switcherTitle}>SELECT CLASS SESSION</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classChipsRow}>
          {classes.map((cls) => {
            const isSelected = selectedClass?.id === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                onPress={() => setSelectedClass(cls)}
                style={[
                  styles.classChip,
                  {
                    backgroundColor: isSelected ? '#208AEF' : theme.backgroundElement,
                    borderColor: isSelected ? '#208AEF' : theme.backgroundSelected,
                  },
                ]}
              >
                <SymbolView
                  tintColor={isSelected ? '#ffffff' : theme.textSecondary}
                  name="rectangle.3.group.fill"
                  size={14}
                />
                <ThemedText
                  type="smallBold"
                  style={{ color: isSelected ? '#ffffff' : theme.text }}
                >
                  {cls.class_name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loadingStudents ? (
        <ActivityIndicator size="large" color="#208AEF" style={{ marginTop: 40 }} />
      ) : students.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <SymbolView tintColor={theme.textSecondary} name="person.slash" size={32} />
          <ThemedText type="smallBold" style={{ marginTop: 8 }}>No Students Enrolled</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            No students have been enrolled in {selectedClass?.class_name || 'this class'} yet by Admin.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold" style={styles.studentName}>{item.full_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">No: {item.admission_number || item.id}</ThemedText>
              </View>

              <View style={styles.statusRow}>
                {['present', 'late', 'absent'].map((opt) => {
                  const isActive = item.status === opt;
                  let activeColor = '#34C759';
                  if (opt === 'late') activeColor = '#FF9500';
                  if (opt === 'absent') activeColor = '#FF3B30';

                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => updateStatus(item.id, opt)}
                      style={[
                        styles.statusBtn,
                        isActive
                          ? { backgroundColor: activeColor }
                          : { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: isActive ? '#ffffff' : theme.text }}
                      >
                        {opt.toUpperCase()}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.remarksInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Add optional attendance note..."
                placeholderTextColor={theme.textSecondary}
                value={item.remarks}
                onChangeText={(txt) => updateRemarks(item.id, txt)}
              />

              <TouchableOpacity
                onPress={() => submitAttendance(item)}
                style={styles.saveBtn}
                disabled={savingId !== null}
              >
                {savingId === item.id ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <SymbolView tintColor="#ffffff" name="checkmark.circle" size={14} />
                    <ThemedText style={styles.saveBtnText}>Save Record</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ThemedView>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switcherContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  switcherTitle: {
    letterSpacing: 1.1,
    fontSize: 11,
  },
  classChipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.one,
  },
  emptyCard: {
    margin: Spacing.four,
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.one,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 15,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  statusBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remarksInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#208AEF',
    height: 42,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

