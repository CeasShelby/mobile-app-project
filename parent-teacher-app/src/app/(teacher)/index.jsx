import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function TeacherDashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const theme = useTheme();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyClasses = async () => {
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
        setLoading(false);
      }
    };
    fetchMyClasses();
  }, [token]);

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">Welcome back,</ThemedText>
              <ThemedText type="subtitle" style={styles.teacherName}>{user?.full_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.employeeInfo}>
                Employee No: {user?.employee_number || 'TCH2026001'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.employeeInfo}>
                Specialization: {user?.specialization || 'Mathematics'}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <SymbolView tintColor="#FF3B30" name="power" size={20} />
            </TouchableOpacity>
          </View>
        </ThemedView>

        <ThemedText type="smallBold" style={styles.sectionHeader}>ACTIVE CLASS SESSION</ThemedText>

        {loading ? (
          <ActivityIndicator size="small" color="#208AEF" style={{ marginVertical: 10 }} />
        ) : classes.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <ThemedText type="small" themeColor="textSecondary">
              No classes assigned yet by Admin.
            </ThemedText>
          </ThemedView>
        ) : (
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
        )}

        <ThemedText type="smallBold" style={styles.sectionHeader}>CLASSROOM OVERVIEW (LIVE DATA)</ThemedText>
        
        <View style={styles.statsGrid}>
          <ThemedView type="backgroundElement" style={styles.gridItem}>
            <SymbolView tintColor="#34C759" name="person.3.fill" size={20} />
            <ThemedText type="subtitle">{selectedClass ? selectedClass.student_count : 0}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Enrolled Students</ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.gridItem}>
            <SymbolView tintColor="#208AEF" name="checkmark.seal.fill" size={20} />
            <ThemedText type="subtitle">100%</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Active Status</ThemedText>
          </ThemedView>
        </View>

        <ThemedText type="smallBold" style={styles.sectionHeader}>TEACHER ACTIONS</ThemedText>

        <ThemedView type="backgroundElement" style={styles.actionRow}>
          <SymbolView tintColor="#FF9500" name="calendar" size={18} />
          <View style={styles.actionTextCol}>
            <ThemedText type="smallBold">Daily Registration</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Log student attendance for {selectedClass?.class_name || 'selected class'}
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.actionRow}>
          <SymbolView tintColor="#5856D6" name="pencil.and.outline" size={18} />
          <View style={styles.actionTextCol}>
            <ThemedText type="smallBold">Exam Report Cards</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Record term grades for {selectedClass?.class_name || 'selected class'}
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teacherName: {
    fontWeight: 'bold',
  },
  employeeInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    padding: Spacing.two,
    borderRadius: 50,
    backgroundColor: '#FF3B301A',
  },
  sectionHeader: {
    marginTop: Spacing.two,
    letterSpacing: 1.2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridItem: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  actionRow: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  actionTextCol: {
    flex: 1,
    gap: 2,
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
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
});

