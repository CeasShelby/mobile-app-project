import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { API_URL } from '@/constants/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Grab the login function from our global AuthContext
  const { login } = useContext(AuthContext);
  
  // Resolve colors based on current system light/dark theme
  const scheme = useColorScheme() || 'light';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const handleLogin = async () => {
    // 1. Validation check
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log('Sending login request to:', `${API_URL}/login.php`);
      
      // 2. Fetch connection to PHP endpoint
      const response = await fetch(`${API_URL}/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // 3. Check for API failures (like status 400 Bad Request)
      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      console.log('Login successful! Storing session...');
      
      // 4. Update the global context state and save credentials locally
      await login(data.token, data.user);
    } catch (err: any) {
      console.error('Login error:', err.message);
      setError(err.message || 'Something went wrong. Please try again.');
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
            {/* Logo and Titles Header */}
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Parent-Teacher Hub
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Sign in to stay connected with student progress
              </ThemedText>
            </ThemedView>

            {/* Input Form Fields */}
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
                placeholder="Enter email (e.g. parent@example.com)"
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

              {/* Submit Button */}
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
    marginBottom: Spacing.five,
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
});
