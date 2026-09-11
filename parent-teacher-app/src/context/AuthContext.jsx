import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { fetchUserProfile } from '@/services/auth';

// Create global authentication context
export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Load saved session credentials on app startup & validate token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('userToken');
        const savedUser  = await AsyncStorage.getItem('userProfile');

        if (savedToken) {
          setToken(savedToken);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }

          // Validate token with live backend profile endpoint
          try {
            const liveProfile = await fetchUserProfile();
            setUser(liveProfile);
            await AsyncStorage.setItem('userProfile', JSON.stringify(liveProfile));
          } catch (valErr) {
            console.log('Session verification check:', valErr.message);
            // If token expired (401), clear invalid session
            if (valErr.message?.includes('401') || valErr.message?.includes('expired') || valErr.message?.includes('required')) {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userProfile');
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to restore login session:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 2. Perform Login & Store Credentials
  const login = async (newToken, newUser) => {
    try {
      await AsyncStorage.setItem('userToken', newToken);
      await AsyncStorage.setItem('userProfile', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Failed to save login session:', error);
      throw error;
    }
  };

  // 3. Perform Logout, Clear Session Storage, & Redirect to Login Screen
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userProfile');
      setToken(null);
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Failed to clear login session:', error);
    }
  };

  // 4. Refresh Profile Data from Server
  const refreshProfile = async () => {
    try {
      if (token) {
        const liveProfile = await fetchUserProfile();
        setUser(liveProfile);
        await AsyncStorage.setItem('userProfile', JSON.stringify(liveProfile));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
