import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, View, ActivityIndicator } from 'react-native';
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

// Ugandan Secondary UNEB Grade Helper
function calculateUgandanGrade(score, total, isALevel) {
  const m = parseFloat(score);
  const t = parseFloat(total) || 100;
  if (isNaN(m) || m < 0 || t <= 0) return null;

  const pct = (m / t) * 100;

  if (isALevel) {
    if (pct >= 80) return { grade: 'A', label: 'Principal A (Distinction)', color: '#34C759' };
    if (pct >= 70) return { grade: 'B', label: 'Principal B (Credit)', color: '#30B0C7' };
    if (pct >= 60) return { grade: 'C', label: 'Principal C (Credit)', color: '#14B8A6' };
    if (pct >= 50) return { grade: 'D', label: 'Principal D (Pass)', color: '#FF9500' };
    if (pct >= 40) return { grade: 'E', label: 'Principal E (Pass)', color: '#FF9500' };
    if (pct >= 35) return { grade: 'O', label: 'Subsidiary O', color: '#FF2D55' };
    return { grade: 'F', label: 'Fail F', color: '#FF3B30' };
  } else {
    if (pct >= 80) return { grade: 'D1', label: 'Distinction 1', color: '#34C759' };
    if (pct >= 75) return { grade: 'D2', label: 'Distinction 2', color: '#30B0C7' };
    if (pct >= 66) return { grade: 'C3', label: 'Credit 3', color: '#14B8A6' };
    if (pct >= 60) return { grade: 'C4', label: 'Credit 4', color: '#14B8A6' };
    if (pct >= 55) return { grade: 'C5', label: 'Credit 5', color: '#5856D6' };
    if (pct >= 50) return { grade: 'C6', label: 'Credit 6', color: '#5856D6' };
    if (pct >= 45) return { grade: 'P7', label: 'Pass 7', color: '#FF9500' };
    if (pct >= 40) return { grade: 'P8', label: 'Pass 8', color: '#FF9500' };
    return { grade: 'F9', label: 'Fail 9', color: '#FF3B30' };
  }
}

export default function RecordProgressScreen() {
  const { token } = useContext(AuthContext);
  const { selectedClass } = useContext(TeacherClassContext);
  const theme = useTheme();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [assessmentName, setAssessmentName] = useState('');
  const [assessmentType, setAssessmentType] = useState('BOT'); // BOT, MOT, EOT, Continuous
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [remarks, setRemarks] = useState('');

  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isALevel = selectedClass ? (selectedClass.grade_level >= 5) : false;
  const gradePreview = calculateUgandanGrade(marksObtained, totalMarks, isALevel);

  // 1. Fetch live student roster, subjects, and recent class posts whenever selectedClass changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchStreamData = async () => {
      if (students.length === 0) {
        setLoading(true);
      }
      try {
        const [rRes, sRes, pRes] = await Promise.all([
          fetch(`${API_URL}/attendance/get_students_by_class.php?class_id=${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/progress/get_subjects.php?class_id=${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/progress/get_class_progress.php?class_id=${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
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

        if (pRes.ok) {
          const pData = await pRes.json();
          if (Array.isArray(pData)) {
            setRecentPosts(pData);
          }
        }
      } catch (err) {
        console.log('Failed to fetch class stream assessment data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamData();
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
        assessment_name: assessmentName || `${selectedSubject.subject_name} (${assessmentType})`,
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
        'Assessment Score Posted',
        `Score posted successfully!\n\nStudent: ${selectedStudent.full_name}\nSubject: ${selectedSubject.subject_name}\nScore: ${marksObtained}/${totalMarks}\nUNEB Grade: ${data.grade}\n📢 Parent notified instantly!`
      );
      
      setMarksObtained('');
      setRemarks('');

      // Refresh recent posts list
      const pRes = await fetch(`${API_URL}/progress/get_class_progress.php?class_id=${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) setRecentPosts(pData);
      }

    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit assessment grade.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.form}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Secondary Assessment & Marks</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Post term evaluation scores & UNEB marks (O-Level D1–F9 / A-Level A–F).
          </ThemedText>
        </View>

        {/* 1. Global Active Secondary Class Switcher */}
        <ActiveClassSelector title="1. ACTIVE SECONDARY STREAM" />

        {/* 2. Subject Picker */}
        <ThemedText style={styles.label}>2. SELECT SUBJECT</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {subjects.map((sub) => {
            const isSelected = selectedSubject?.id === sub.id;
            return (
              <TouchableOpacity
                key={sub.id}
                onPress={() => setSelectedSubject(sub)}
                activeOpacity={0.7}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText style={styles.label}>3. SELECT STUDENT</ThemedText>
        </View>

        {students.length > 0 && (
          <View style={[styles.searchBarBox, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView tintColor={theme.textSecondary} name="magnifyingglass" size={14} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search student by name or adm no..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <SymbolView tintColor={theme.textSecondary} name="xmark.circle.fill" size={14} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {students.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyBox}>
            <ThemedText type="small" themeColor="textSecondary">
              No students enrolled in {selectedClass?.class_name || 'this class'} yet.
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {students
              .filter(s =>
                (s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (s.admission_number && s.admission_number.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((stu) => {
                const isSelected = selectedStudent?.id === stu.id;
                return (
                  <TouchableOpacity
                    key={stu.id}
                    onPress={() => setSelectedStudent(stu)}
                    activeOpacity={0.7}
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

        {/* 4. Assessment Type Category */}
        <ThemedText style={styles.label}>4. ASSESSMENT EVALUATION PERIOD</ThemedText>
        <View style={styles.categoryRow}>
          {[
            { id: 'BOT', label: 'BOT (Beginning of Term)' },
            { id: 'MOT', label: 'MOT (Middle of Term)' },
            { id: 'EOT', label: 'EOT (End of Term)' },
            { id: 'Continuous', label: 'Continuous Evaluation' },
          ].map((cat) => {
            const isSelected = assessmentType === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setAssessmentType(cat.id)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: isSelected ? '#14B8A6' : theme.backgroundElement,
                    borderColor: isSelected ? '#14B8A6' : theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: isSelected ? '#ffffff' : theme.text, fontSize: 11 }}
                >
                  {cat.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Assessment Details & Live UNEB Grade Preview */}
        <ThemedText style={styles.label}>ASSESSMENT TITLE</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          placeholder="e.g. Term 1 Physics Paper 1 Exam"
          placeholderTextColor={theme.textSecondary}
          value={assessmentName}
          onChangeText={setAssessmentName}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>MARKS OBTAINED</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              placeholder="e.g. 78.5"
              placeholderTextColor={theme.textSecondary}
              value={marksObtained}
              onChangeText={setMarksObtained}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.col}>
            <ThemedText style={styles.label}>TOTAL MARKS</ThemedText>
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

        {/* Live UNEB Grade Indicator Banner */}
        {gradePreview && (
          <View style={[styles.gradePreviewCard, { borderColor: gradePreview.color + '60' }]}>
            <View style={styles.gradePreviewLeft}>
              <View style={[styles.gradeBadge, { backgroundColor: gradePreview.color }]}>
                <ThemedText style={styles.gradeBadgeText}>{gradePreview.grade}</ThemedText>
              </View>
              <View>
                <ThemedText type="smallBold" style={{ color: gradePreview.color }}>
                  {gradePreview.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                  Percentage: {((parseFloat(marksObtained) / parseFloat(totalMarks || '100')) * 100).toFixed(1)}% ({isALevel ? 'A-Level UACE Scale' : 'O-Level UCE Scale'})
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        <ThemedText style={styles.label}>TEACHER EVALUATION & REMARKS</ThemedText>
        <TextInput
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
          placeholder="Write evaluation comments for student and parent..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          value={remarks}
          onChangeText={setRemarks}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <SymbolView tintColor="#ffffff" name="square.and.pencil" size={16} />
              <ThemedText style={styles.submitText}>Post Assessment Score & Notify Parent</ThemedText>
            </>
          )}
        </TouchableOpacity>

        {/* Recent Stream Assessment History */}
        {recentPosts.length > 0 && (
          <View style={styles.recentSection}>
            <ThemedText type="smallBold" style={styles.label}>
              RECENTLY POSTED SCORES ({selectedClass?.class_name})
            </ThemedText>
            {recentPosts.slice(0, 5).map((post) => (
              <ThemedView key={post.id} type="backgroundElement" style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <ThemedText type="smallBold">{post.student_name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                      {post.subject_name} • {post.assessment_name}
                    </ThemedText>
                  </View>
                  <View style={styles.historyRight}>
                    <View style={styles.miniGradePill}>
                      <ThemedText type="smallBold" style={{ color: '#14B8A6', fontSize: 11 }}>
                        {post.grade} ({post.marks_obtained}/{post.total_marks})
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 10 }}>
                      {post.assessment_date}
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>
            ))}
          </View>
        )}
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
    paddingBottom: 100,
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  catChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 12,
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
    borderRadius: 10,
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
  gradePreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#14B8A60A',
    marginVertical: Spacing.one,
  },
  gradePreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeBadgeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#14B8A6',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  recentSection: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  historyCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    gap: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  miniGradePill: {
    backgroundColor: '#14B8A61A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    height: 38,
    marginBottom: Spacing.one,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
});
