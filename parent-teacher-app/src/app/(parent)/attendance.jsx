import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { getParentDashboard } from '@/services/parent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function AttendanceScreen() {
  const { token, user } = useContext(AuthContext);
  const theme = useTheme();

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch parent's actual linked children
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setLoading(true);
        const dashData = await getParentDashboard();
        const childrenList = dashData?.data?.students || dashData?.students || [];
        
        if (Array.isArray(childrenList) && childrenList.length > 0) {
          setStudents(childrenList);
          setSelectedStudent(childrenList[0]);
        }
      } catch (err) {
        console.log('Failed to fetch parent linked children:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [token]);

  // 2. Fetch live attendance records for selected linked child
  useEffect(() => {
    if (!selectedStudent) return;

    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/attendance/get_attendance.php?student_id=${selectedStudent.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const resJson = await response.json();
          const list = resJson.data || resJson;
          setRecords(Array.isArray(list) ? list : []);
        } else {
          setRecords([]);
        }
      } catch (err) {
        console.log('API call failed fetching attendance:', err.message);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [selectedStudent, token]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return '#34C759';
      case 'late':
        return '#FF9500';
      case 'absent':
        return '#FF3B30';
      default:
        return theme.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'checkmark.circle.fill';
      case 'late':
        return 'clock.fill';
      case 'absent':
        return 'xmark.circle.fill';
      default:
        return 'questionmark.circle';
    }
  };

  if (loading && !selectedStudent) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={records}
        keyExtractor={(item) => (item.id || Math.random()).toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Multi-Child Selector Chips */}
            {students.length > 1 && (
              <View style={styles.childChipsRow}>
                {students.map((child) => {
                  const isSelected = selectedStudent?.id === child.id;
                  return (
                    <TouchableOpacity
                      key={child.id}
                      onPress={() => setSelectedStudent(child)}
                      style={[
                        styles.childChip,
                        { backgroundColor: isSelected ? '#14B8A6' : theme.backgroundElement }
                      ]}
                    >
                      <ThemedText style={{ color: isSelected ? '#ffffff' : theme.text, fontWeight: 'bold', fontSize: 12 }}>
                        {child.full_name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <ThemedText type="subtitle">
              {selectedStudent ? `${selectedStudent.full_name}'s Attendance Log` : 'Child Attendance Log'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Check daily school roll-call logs, arrival status, and teacher remarks.
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <SymbolView tintColor={theme.textSecondary} name="calendar.badge.clock" size={36} />
              <ThemedText type="smallBold" style={{ marginTop: 8 }}>No Attendance Records</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {selectedStudent ? `No daily attendance logs recorded yet for ${selectedStudent.full_name}.` : 'No child linked to account.'}
              </ThemedText>
            </ThemedView>
          )
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.dateCol}>
                <ThemedText type="smallBold">{item.attendance_date}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{item.class_name || selectedStudent?.class_name}</ThemedText>
              </View>

              <View style={styles.statusContainer}>
                <SymbolView tintColor={getStatusColor(item.status)} name={getStatusIcon(item.status)} size={16} />
                <ThemedText type="smallBold" style={{ color: getStatusColor(item.status), textTransform: 'capitalize' }}>
                  {item.status}
                </ThemedText>
              </View>
            </View>

            {item.remarks && (
              <View style={styles.remarksBox}>
                <ThemedText type="small" style={styles.remarksText}>
                  Note: "{item.remarks}"
                </ThemedText>
              </View>
            )}

            {item.recorded_by_name && (
              <View style={styles.cardFooter}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                  Recorded by: {item.recorded_by_name}
                </ThemedText>
              </View>
            )}
          </ThemedView>
        )}
      />
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
    gap: Spacing.half,
  },
  childChipsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  childChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
  emptyCard: {
    padding: Spacing.six,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateCol: {
    gap: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  remarksBox: {
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: '#00000008',
  },
  remarksText: {
    fontStyle: 'italic',
    fontSize: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f01a',
    paddingTop: Spacing.one,
  },
  footerText: {
    fontSize: 11,
  },
});
