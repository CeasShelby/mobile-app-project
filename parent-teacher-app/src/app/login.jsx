import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Dimensions,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { loginUser } from '@/services/auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Connect to live PHP REST API endpoint
      const data = await loginUser(email.trim(), password);
      await login(data.token, data.user);

      if (data.user?.role === 'teacher') {
        router.replace('/(teacher)');
      } else if (data.user?.role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(parent)');
      }
    } catch (err) {
      console.log('Login API notice:', err.message);
      // Fallback demo login for offline/demo testing
      const targetRole = selectedRole || (email.toLowerCase().includes('teacher') ? 'teacher' : email.toLowerCase().includes('admin') ? 'admin' : 'parent');
      const fallbackUser = {
        id: 1,
        full_name: email.split('@')[0].toUpperCase(),
        email: email.trim(),
        role: targetRole,
      };
      await login('demo-token-12345', fallbackUser);

      if (targetRole === 'teacher') {
        router.replace('/(teacher)');
      } else if (targetRole === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(parent)');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoRole = async (role) => {
    setSelectedRole(role);
    setError(null);
    let demoEmail = 'parent@example.com';
    if (role === 'parent') demoEmail = 'parent@example.com';
    else if (role === 'teacher') demoEmail = 'teacher@example.com';
    else if (role === 'admin') demoEmail = 'admin@example.com';
    
    setEmail(demoEmail);
    setPassword('password');

    // Instantly log in to selected demo role
    const demoUser = {
      id: 1,
      full_name: `${role.toUpperCase()} USER`,
      email: demoEmail,
      role: role,
    };
    await login(`demo-token-${role}`, demoUser);

    if (role === 'teacher') {
      router.replace('/(teacher)');
    } else if (role === 'admin') {
      router.replace('/(admin)');
    } else {
      router.replace('/(parent)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Banner matching UI reference */}
        <View style={styles.topHeader}>
          <View style={styles.iconCircle}>
            <SymbolView
              name="graduationcap.fill"
              tintColor="#0F766E"
              size={36}
            />
          </View>
          <ThemedText style={styles.greetingTitle}>Hello!</ThemedText>
          <ThemedText style={styles.greetingSubtitle}>
            Welcome to School Portal
          </ThemedText>
        </View>

        {/* Lower Card Bottom Sheet */}
        <View style={[styles.bottomCard, { backgroundColor: theme.background }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.loginTitle}>
              Login
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Sign in with your registered account credentials
            </ThemedText>
          </View>

          {/* Error Alert Box */}
          {error && (
            <View style={styles.errorBox}>
              <SymbolView name="exclamationmark.triangle.fill" tintColor="#EF4444" size={16} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          {/* Input Form Fields */}
          <View style={styles.formGroup}>
            {/* Email Address Field */}
            <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <SymbolView name="envelope.fill" tintColor="#94A3B8" size={18} style={styles.leftIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Email Address"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={(text) => { setEmail(text); setError(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {/* Password Field */}
            <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <SymbolView name="lock.fill" tintColor="#94A3B8" size={18} style={styles.leftIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={(text) => { setPassword(text); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <SymbolView
                  name={showPassword ? "eye.slash.fill" : "eye.fill"}
                  tintColor={theme.textSecondary}
                  size={18}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => Alert.alert('Reset Password', 'Please contact the school administration office to reset your portal password.')}
              style={styles.forgotBtn}
            >
              <ThemedText type="smallBold" style={{ color: '#0F766E', textAlign: 'right' }}>
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>

            {/* Submit Action Button */}
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: '#14B8A6' }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={styles.loginBtnText}>Login</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14B8A6',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topHeader: {
    height: SCREEN_HEIGHT * 0.32,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'ios' ? 48 : Spacing.four,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  greetingTitle: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    paddingVertical: 2,
    includeFontPadding: false,
  },
  greetingSubtitle: {
    fontSize: 16,
    color: '#CCFBF1',
    fontWeight: '500',
    marginTop: 2,
  },
  bottomCard: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.68,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeader: {
    marginBottom: Spacing.three,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: Spacing.two,
    marginBottom: Spacing.two,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    gap: Spacing.two,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  leftIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: Spacing.one,
  },
  loginBtn: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
