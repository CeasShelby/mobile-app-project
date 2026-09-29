// ============================================================
// Self-Service Profile & Password Management Modal Component
// File: parent-teacher-app/src/components/ProfileEditModal.jsx
// Rationale: Allows Parents, Teachers, and Admins to edit contact details & update security password
// ============================================================

import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '@/context/AuthContext';
import { updateUserProfile, changePassword } from '@/services/auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useThemeContext } from '@/context/ThemeContext';
import { Spacing } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';

export function ProfileEditModal({ visible, onClose }) {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const { user, refreshProfile } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'security'

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user && visible) {
      setFullName(user.full_name || '');
      setPhoneNumber(user.phone_number || '');
      setOccupation(user.occupation || '');
      setAddress(user.address || '');
      setQualification(user.qualification || '');
      setSpecialization(user.specialization || '');
    }
  }, [user, visible]);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be left blank.');
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        occupation: occupation.trim(),
        address: address.trim(),
        qualification: qualification.trim(),
        specialization: specialization.trim(),
      };

      await updateUserProfile(payload);
      await refreshProfile();

      Alert.alert('Profile Saved', 'Your profile details have been updated successfully!');
      onClose();
    } catch (err) {
      console.log('Profile update error:', err.message);
      Alert.alert('Update Failed', err.message || 'Unable to save profile changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter both your current password and new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword(currentPassword, newPassword);

      Alert.alert('Password Updated', 'Your security password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      console.log('Password change error:', err.message);
      Alert.alert('Password Error', err.message || 'Current password is incorrect.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleRow}>
            <SymbolView tintColor="#14B8A6" name="person.crop.circle.badge.checkmark" size={24} />
            <View>
              <ThemedText type="subtitle">Edit User Profile</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textTransform: 'capitalize' }}>
                {user?.role || 'User'} Account • {user?.email}
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.backgroundSelected }]}>
            <SymbolView tintColor={theme.text} name="xmark" size={16} />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('profile')}
            style={[
              styles.tabBtn,
              activeTab === 'profile' ? { backgroundColor: '#14B8A6' } : { backgroundColor: theme.backgroundSelected }
            ]}
          >
            <ThemedText style={[styles.tabBtnText, { color: activeTab === 'profile' ? '#ffffff' : theme.text }]}>
              Contact Details
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('security')}
            style={[
              styles.tabBtn,
              activeTab === 'security' ? { backgroundColor: '#14B8A6' } : { backgroundColor: theme.backgroundSelected }
            ]}
          >
            <ThemedText style={[styles.tabBtnText, { color: activeTab === 'security' ? '#ffffff' : theme.text }]}>
              Password & Security
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'profile' ? (
            <ThemedView type="backgroundElement" style={styles.formCard}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>PERSONAL DETAILS</ThemedText>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" style={styles.label}>Full Name *</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. John Doe Sr."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" style={styles.label}>Phone Number</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="e.g. +256 700 000 000"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Role Specific Fields */}
              {user?.role === 'parent' && (
                <>
                  <View style={styles.fieldGroup}>
                    <ThemedText type="small" style={styles.label}>Occupation</ThemedText>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      value={occupation}
                      onChangeText={setOccupation}
                      placeholder="e.g. Civil Engineer"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <ThemedText type="small" style={styles.label}>Home Address</ThemedText>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="e.g. Plot 45 Kampala Road, Uganda"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </>
              )}

              {user?.role === 'teacher' && (
                <>
                  <View style={styles.fieldGroup}>
                    <ThemedText type="small" style={styles.label}>Teaching Qualification</ThemedText>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      value={qualification}
                      onChangeText={setQualification}
                      placeholder="e.g. Bachelor of Education (Science)"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <ThemedText type="small" style={styles.label}>Subject Specialization</ThemedText>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      value={specialization}
                      onChangeText={setSpecialization}
                      placeholder="e.g. Mathematics & Physics"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </>
              )}

              {/* App Theme Preference Switcher */}
              <View style={[styles.fieldGroup, { marginTop: Spacing.two }]}>
                <ThemedText type="small" style={styles.label}>APP THEME PREFERENCE</ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: 4 }}>
                  {[
                    { mode: 'light', label: '☀️ Light' },
                    { mode: 'dark', label: '🌙 Dark' },
                    { mode: 'system', label: '📱 System' },
                  ].map((item) => {
                    const isSelected = themeMode === item.mode;
                    return (
                      <TouchableOpacity
                        key={item.mode}
                        onPress={() => setThemeMode(item.mode)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? '#14B8A6' : theme.backgroundSelected,
                        }}
                      >
                        <ThemedText style={{ color: isSelected ? '#ffffff' : theme.text, fontWeight: 'bold', fontSize: 12 }}>
                          {item.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={savingProfile}
                style={[styles.submitBtn, { backgroundColor: '#14B8A6' }]}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <SymbolView tintColor="#ffffff" name="checkmark.circle.fill" size={16} />
                    <ThemedText style={styles.submitBtnText}>Save Profile Changes</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.formCard}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>CHANGE ACCOUNT PASSWORD</ThemedText>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" style={styles.label}>Current Password *</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" style={styles.label}>New Password * (Min 6 chars)</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="small" style={styles.label}>Confirm New Password *</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={savingPassword}
                style={[styles.submitBtn, { backgroundColor: '#FF3B30' }]}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <SymbolView tintColor="#ffffff" name="lock.fill" size={16} />
                    <ThemedText style={styles.submitBtnText}>Update Security Password</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f01a',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.one,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: Spacing.three,
  },
  formCard: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 1.1,
    marginBottom: Spacing.one,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
  },
  submitBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
