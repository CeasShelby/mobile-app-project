import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { loginUser } from '@/services/auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  
  const scheme = useColorScheme() || 'light';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Connect to live PHP REST API backend endpoint /api/auth/login.php
      const data = await loginUser(email, password);
      
      // Save session token and user profile into AuthContext & AsyncStorage
      await login(data.token, data.user);

      // Navigate to the appropriate dashboard based on user role
      if (data.user?.role === 'teacher') {
        router.replace('/(teacher)');
      } else if (data.user?.role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(parent)');
      }
    } catch (err) {
      console.log('Login error:', err.message);
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Parent-Teacher Hub
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Sign in to monitor student progress & school communication
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.form}>
              {error && (
                <ThemedView style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </ThemedView>
              )}

              <ThemedText style={styles.label}>Email Address</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                placeholder="e.g. parent@example.com, teacher@example.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                placeholder="Enter password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#208AEF' }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Sign In</ThemedText>
                )}
              </TouchableOpacity>

              <View style={styles.demoCredentialsBox}>
                <ThemedText type="smallBold" style={styles.demoTitle}>Demo Credentials:</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Parent: parent@example.com | password</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Teacher: teacher@example.com | password</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Admin: admin@example.com | password</ThemedText>
              </View>
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: Spacing.one,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: Spacing.two,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    marginBottom: Spacing.two,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: 'bold',
  },
  demoCredentialsBox: {
    marginTop: Spacing.four,
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: '#0000000a',
    gap: 4,
  },
  demoTitle: {
    fontSize: 12,
  },
});
