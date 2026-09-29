import { Redirect } from 'expo-router';
import { useContext } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';

export default function IndexRedirect() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === 'teacher') {
    return <Redirect href="/(teacher)" />;
  } else if (user.role === 'admin') {
    return <Redirect href="/(admin)" />;
  } else {
    return <Redirect href="/(parent)" />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
