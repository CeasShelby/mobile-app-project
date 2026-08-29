import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the User profile interface matching our database fields
export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'parent';
  teacher_id?: number;
  parent_id?: number;
  employee_number?: string;
  qualification?: string;
  specialization?: string;
  occupation?: string;
  address?: string;
  profile_picture?: string;
}

// Define the shape of our context state
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean; // Tells the app if it is still checking local storage on launch
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with empty default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

// Create the context provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved credentials from local storage on app startup
  useEffect(() => {
    const loadSavedAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('userToken');
        const savedUser = await AsyncStorage.getItem('userProfile');
        
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Failed to load auth state from local storage:', error);
      } finally {
        setLoading(false); // Finished checking
      }
    };

    loadSavedAuth();
  }, []);

  // Save credentials to local storage during login
  const login = async (newToken: string, newUser: User) => {
    try {
      await AsyncStorage.setItem('userToken', newToken);
      await AsyncStorage.setItem('userProfile', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Failed to save login session to local storage:', error);
      throw error;
    }
  };

  // Clear credentials from local storage during logout
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userProfile');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Failed to clear login session from local storage:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
