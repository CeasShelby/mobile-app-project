import React, { useContext } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, AuthContext } from '@/context/AuthContext';
import LoginScreen from './login';

SplashScreen.preventAutoHideAsync();

function MainAppLayout() {
  const { user, loading } = useContext(AuthContext);

  // If we are still checking local storage for an active session, show a loading spinner
  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  // If the user is not logged in, display the Login screen
  if (!user) {
    return <LoginScreen />;
  }

  // If the user is logged in, show the main tab screens
  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
    </>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <MainAppLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
