import React, { useContext } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { TeacherClassContext } from '@/context/TeacherClassContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';

export function ActiveClassSelector({ title = "ACTIVE CLASS SESSION (UGANDAN SECONDARY)" }) {
  const { classes, selectedClass, setSelectedClass, loading } = useContext(TeacherClassContext);
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#14B8A6" />
        <ThemedText type="small" themeColor="textSecondary">Loading secondary classes...</ThemedText>
      </View>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.emptyCard}>
        <ThemedText type="small" themeColor="textSecondary">
          No secondary classes assigned yet by Administrator.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {title ? (
        <View style={styles.headerRow}>
          <ThemedText type="smallBold" style={styles.sectionHeader}>
            {title}
          </ThemedText>
          {selectedClass && (
            <View style={styles.levelBadge}>
              <ThemedText type="smallBold" style={styles.levelBadgeText}>
                {selectedClass.grade_level >= 5 ? 'A-Level' : 'O-Level'}
              </ThemedText>
            </View>
          )}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.classChipsRow}
      >
        {classes.map((cls) => {
          const isSelected = selectedClass?.id === cls.id;
          const isALevel = cls.grade_level >= 5;

          return (
            <TouchableOpacity
              key={cls.id}
              onPress={() => setSelectedClass(cls)}
              activeOpacity={0.7}
              style={[
                styles.classChip,
                {
                  backgroundColor: isSelected ? '#14B8A6' : theme.backgroundElement,
                  borderColor: isSelected ? '#14B8A6' : theme.backgroundSelected,
                },
              ]}
            >
              <SymbolView
                tintColor={isSelected ? '#ffffff' : theme.textSecondary}
                name={isALevel ? "graduationcap.fill" : "book.fill"}
                size={14}
              />
              <View style={styles.chipTextCol}>
                <ThemedText
                  type="smallBold"
                  style={{ color: isSelected ? '#ffffff' : theme.text }}
                >
                  {cls.class_name}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    color: isSelected ? '#ffffffb3' : theme.textSecondary,
                    fontSize: 10,
                  }}
                >
                  {cls.student_count || 0} Students • {isALevel ? 'A-Level' : 'O-Level'}
                </ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  sectionHeader: {
    letterSpacing: 1.1,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  levelBadge: {
    backgroundColor: '#14B8A61F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#14B8A640',
  },
  levelBadgeText: {
    color: '#14B8A6',
    fontSize: 10,
  },
  classChipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: 2,
  },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.two,
  },
  chipTextCol: {
    gap: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
});
