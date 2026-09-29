import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { TeacherClassContext } from '@/context/TeacherClassContext';
import { ActiveClassSelector } from '@/components/ActiveClassSelector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';
import { CustomLoader } from '@/components/CustomLoader';

export default function MarkAttendanceScreen() {
  const { token } = useContext(AuthContext);
  const { selectedClass } = useContext(TeacherClassContext);
  const theme = useTheme();

  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().substring(0, 10));

  // 1. Fetch live student roster whenever active secondary class session changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchRoster = async () => {
      if (students.length === 0) {
        setLoadingStudents(true);
      }
      try {
        const response = await fetch(`${API_URL}/attendance/get_students_by_class.php?class_id=${selectedClass.id}&date=${attendanceDate}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
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
  }, [selectedClass, attendanceDate, token]);

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

  // Quick Action: Set all students in active stream to Present
  const markAllPresent = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, status: 'present' }))
    );
  };

  // Filtered student roster for search
  const filteredStudents = students.filter(s =>
    (s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.admission_number && s.admission_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Batch Submit entire stream roll-call
  const submitBatchAttendance = async () => {
    if (!selectedClass || students.length === 0) {
      Alert.alert('Roll-Call Error', 'No active students to record attendance for.');
      return;
    }

    try {
      setSavingBatch(true);

      const payload = {
        class_id: selectedClass.id,
        attendance_date: attendanceDate,
        records: students.map((s) => ({
          student_id: s.id,
          status: s.status,
          remarks: s.remarks || null,
        })),
      };

      const response = await fetch(`${API_URL}/attendance/record_batch_attendance.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit batch roll-call');
      }

      const absentOrLateCount = students.filter(s => s.status !== 'present').length;
      let alertMsg = `Saved roll-call for ${students.length} students in ${selectedClass.class_name}.`;
      if (absentOrLateCount > 0) {
        alertMsg += `\n\n📢 Parent alerts automatically sent for ${absentOrLateCount} student(s) marked Absent or Late.`;
      }

      Alert.alert('Roll-Call Saved Successfully', alertMsg);

    } catch (err) {
      Alert.alert('Submission Failed', err.message || 'Failed to save batch attendance.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Compute live roll-call statistics
  const presentCount = students.filter(s => s.status === 'present').length;
  const lateCount    = students.filter(s => s.status === 'late').length;
  const absentCount  = students.filter(s => s.status === 'absent').length;
  const totalCount   = students.length;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Active Secondary Class Switcher Header */}
      <View style={styles.switcherContainer}>
        <ActiveClassSelector title="1. ROLL-CALL SECONDARY STREAM" />
      </View>

      {/* Roster & Metrics Header */}
      {!loadingStudents && students.length > 0 && (
        <View style={styles.metricsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle" style={{ color: '#14B8A6' }}>{totalCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Roster</ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle" style={{ color: '#34C759' }}>{presentCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Present</ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle" style={{ color: '#FF9500' }}>{lateCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Late</ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle" style={{ color: '#FF3B30' }}>{absentCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Absent</ThemedText>
            </View>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity onPress={markAllPresent} style={[styles.markAllBtn, { backgroundColor: theme.backgroundElement }]}>
              <SymbolView tintColor="#34C759" name="checkmark.circle.fill" size={16} />
              <ThemedText type="smallBold" style={{ color: '#34C759' }}>Mark All Present</ThemedText>
            </TouchableOpacity>
            
            <View style={styles.dateChip}>
              <SymbolView tintColor={theme.textSecondary} name="calendar" size={14} />
              <ThemedText type="small" themeColor="textSecondary">{attendanceDate}</ThemedText>
            </View>
          </View>

          {/* Search Bar Input */}
          <View style={[styles.searchBarBox, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView tintColor={theme.textSecondary} name="magnifyingglass" size={16} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search student name or admission no..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <SymbolView tintColor={theme.textSecondary} name="xmark.circle.fill" size={16} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loadingStudents ? (
        <CustomLoader message="Loading stream student roster..." />
      ) : students.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <SymbolView tintColor={theme.textSecondary} name="person.slash" size={36} />
          <ThemedText type="smallBold" style={{ marginTop: 8 }}>No Students Enrolled</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            No students have been enrolled in {selectedClass?.class_name || 'this secondary class'} yet.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.studentInfoCol}>
                  <ThemedText type="smallBold" style={styles.studentName}>{item.full_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Adm: {item.admission_number || item.id} • {item.gender ? item.gender.toUpperCase() : 'STUDENT'}
                  </ThemedText>
                </View>
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
                      activeOpacity={0.7}
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
                placeholder="Optional attendance note (e.g., Sick bay, Permission)..."
                placeholderTextColor={theme.textSecondary}
                value={item.remarks}
                onChangeText={(txt) => updateRemarks(item.id, txt)}
              />
            </ThemedView>
          )}
        />
      )}

      {/* Batch Submit Footer Button */}
      {!loadingStudents && students.length > 0 && (
        <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.backgroundElement }]}>
          <TouchableOpacity
            style={styles.submitBatchBtn}
            onPress={submitBatchAttendance}
            disabled={savingBatch}
            activeOpacity={0.8}
          >
            {savingBatch ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <SymbolView tintColor="#ffffff" name="checkmark.seal.fill" size={18} />
                <ThemedText style={styles.submitBatchBtnText}>
                  Submit {selectedClass?.class_name || 'Stream'} Roll-Call ({students.length})
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  switcherContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  metricsContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#34C75940',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: 120,
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
  studentInfoCol: {
    gap: 2,
  },
  studentName: {
    fontSize: 15,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.half,
  },
  statusBtn: {
    flex: 1,
    minWidth: 0,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remarksInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  footer: {
    padding: Spacing.three,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  submitBatchBtn: {
    backgroundColor: '#34C759',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  submitBatchBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
    height: 40,
    marginTop: Spacing.one,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
});
