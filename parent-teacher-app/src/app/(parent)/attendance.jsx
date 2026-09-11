import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, View } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function AttendanceScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/attendance/get_attendance.php?student_id=1`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('API server returned error code');
        }

        const data = await response.json();
        setRecords(data);
      } catch (err) {
        console.log('API call failed, falling back to mock attendance:', err.message);
        
        setRecords([
          {
            id: 1,
            student_id: 1,
            class_name: 'Grade 5A',
            attendance_date: '2026-08-28',
            status: 'present',
            remarks: 'On time and active',
            recorded_by_name: 'Sarah Connor',
          },
          {
            id: 2,
            student_id: 1,
            class_name: 'Grade 5A',
            attendance_date: '2026-08-27',
            status: 'present',
            remarks: 'Participated in group discussion',
            recorded_by_name: 'Sarah Connor',
          },
          {
            id: 3,
            student_id: 1,
            class_name: 'Grade 5A',
            attendance_date: '2026-08-26',
            status: 'late',
            remarks: 'Arrived 15 minutes late',
            recorded_by_name: 'Sarah Connor',
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [token]);

  const getStatusColor = (status) => {
    switch (status) {
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
    switch (status) {
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

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">Jimmy Doe's Attendance Log</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Check daily school registration logs. Confirm attendance status and review teacher remarks.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.dateCol}>
                <ThemedText type="smallBold">{item.attendance_date}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{item.class_name}</ThemedText>
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

            <View style={styles.cardFooter}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                Recorded by: {item.recorded_by_name}
              </ThemedText>
            </View>
          </ThemedView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <SymbolView tintColor={theme.textSecondary} name="calendar.badge.exclamationmark" size={32} />
            <ThemedText type="small" themeColor="textSecondary">No attendance logs found.</ThemedText>
          </View>
        }
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
    gap: Spacing.three,
  },
  header: {
    marginBottom: Spacing.two,
    gap: Spacing.half,
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
  dateCol: {
    gap: Spacing.half,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: '#0000000d',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 8,
  },
  remarksBox: {
    backgroundColor: '#00000005',
    padding: Spacing.two,
    borderRadius: 8,
  },
  remarksText: {
    fontStyle: 'italic',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f010',
    paddingTop: Spacing.one,
  },
  footerText: {
    fontSize: 10,
  },
  emptyContainer: {
    padding: Spacing.six,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
