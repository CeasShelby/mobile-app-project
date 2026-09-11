import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, View, ActivityIndicator } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function RecordProgressScreen() {
  const { token } = useContext(AuthContext);
  const theme = useTheme();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [assessmentName, setAssessmentName] = useState('');
  const [assessmentType, setAssessmentType] = useState('Exam');
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch assigned classes & subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classRes, subRes] = await Promise.all([
          fetch(`${API_URL}/teacher/get_my_classes.php`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/progress/get_subjects.php`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (classRes.ok) {
          const classData = await classRes.json();
          if (Array.isArray(classData) && classData.length > 0) {
            setClasses(classData);
            setSelectedClass(classData[0]);
          }
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          if (Array.isArray(subData) && subData.length > 0) {
            setSubjects(subData);
            setSelectedSubject(subData[0]);
          }
        }
      } catch (err) {
        console.log('Failed to fetch classes/subjects:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // 2. Fetch live student roster & level-filtered subjects when selectedClass changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchRosterAndSubjects = async () => {
      try {
        const [rRes, sRes] = await Promise.all([
          fetch(`${API_URL}/attendance/get_students_by_class.php?class_id=${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/progress/get_subjects.php?class_id=${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (rRes.ok) {
          const rData = await rRes.json();
          if (Array.isArray(rData)) {
            setStudents(rData);
            setSelectedStudent(rData.length > 0 ? rData[0] : null);
          }
        }

        if (sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData)) {
            setSubjects(sData);
            setSelectedSubject(sData.length > 0 ? sData[0] : null);
          }
        }
      } catch (err) {
        console.log('Failed to fetch class roster & subjects:', err.message);
      }
    };

    fetchRosterAndSubjects();
  }, [selectedClass, token]);

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedSubject || !marksObtained) {
      Alert.alert('Validation Error', 'Please select a student, subject, and specify marks.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        student_id: selectedStudent.id,
        subject_id: selectedSubject.id,
        assessment_name: assessmentName || `${selectedSubject.subject_name} Exam`,
        assessment_type: assessmentType,
        marks_obtained: parseFloat(marksObtained),
        total_marks: parseFloat(totalMarks || '100'),
        remarks: remarks || null,
        assessment_date: new Date().toISOString().substring(0, 10),
      };

      const response = await fetch(`${API_URL}/progress/record_progress.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record progress');
      }

      Alert.alert(
        'Grade Recorded',
        `Score posted to database!\nStudent: ${selectedStudent.full_name}\nGrade: ${data.grade}\nParent notified instantly!`
      );
      
      setAssessmentName('');
      setMarksObtained('');
      setRemarks('');
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit grade.');
    } finally {
      setSubmitting(false);
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.form}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Secondary Subject Gradebook</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Post exam marks & evaluation notes. Parents receive instant grade alerts.
          </ThemedText>
        </View>

        {/* 1. Class Switcher */}
        <ThemedText style={styles.label}>1. SELECT CLASS STREAM</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {classes.map((cls) => {
            const isSelected = selectedClass?.id === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                onPress={() => setSelectedClass(cls)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? '#208AEF' : theme.backgroundElement,
                    borderColor: isSelected ? '#208AEF' : theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: isSelected ? '#ffffff' : theme.text }}>
                  {cls.class_name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. Subject Picker */}
        <ThemedText style={styles.label}>2. SELECT SUBJECT</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {subjects.map((sub) => {
            const isSelected = selectedSubject?.id === sub.id;
            return (
              <TouchableOpacity
                key={sub.id}
                onPress={() => setSelectedSubject(sub)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? '#5856D6' : theme.backgroundElement,
                    borderColor: isSelected ? '#5856D6' : theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: isSelected ? '#ffffff' : theme.text }}>
                  {sub.subject_name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 3. Student Picker */}
        <ThemedText style={styles.label}>3. SELECT STUDENT</ThemedText>
        {students.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyBox}>
            <ThemedText type="small" themeColor="textSecondary">
              No students enrolled in {selectedClass?.class_name || 'this class'} yet.
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {students.map((stu) => {
              const isSelected = selectedStudent?.id === stu.id;
              return (
                <TouchableOpacity
                  key={stu.id}
                  onPress={() => setSelectedStudent(stu)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? '#34C759' : theme.backgroundElement,
                      borderColor: isSelected ? '#34C759' : theme.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: isSelected ? '#ffffff' : theme.text }}>
                    {stu.full_name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 4. Exam / Assessment Details */}
        <ThemedText style={styles.label}>Assessment Title</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          placeholder="e.g. Midterm Exam, Algebra Quiz, Lab Report"
          placeholderTextColor={theme.textSecondary}
          value={assessmentName}
          onChangeText={setAssessmentName}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>Marks Obtained</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              placeholder="e.g. 85.5"
              placeholderTextColor={theme.textSecondary}
              value={marksObtained}
              onChangeText={setMarksObtained}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.col}>
            <ThemedText style={styles.label}>Total Marks</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              placeholder="100"
              placeholderTextColor={theme.textSecondary}
              value={totalMarks}
              onChangeText={setTotalMarks}
              keyboardType="numeric"
            />
          </View>
        </View>

        <ThemedText style={styles.label}>Teacher Remarks & Feedback</ThemedText>
        <TextInput
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          placeholder="Write constructive evaluation notes for the student and parent..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          value={remarks}
          onChangeText={setRemarks}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <SymbolView tintColor="#ffffff" name="square.and.pencil" size={16} />
              <ThemedText style={styles.submitText}>Post Grade & Notify Parent</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  form: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    marginBottom: Spacing.one,
    gap: Spacing.half,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: Spacing.one,
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
    borderWidth: 1,
  },
  emptyBox: {
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  col: {
    flex: 1,
    gap: 2,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#34C759',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
