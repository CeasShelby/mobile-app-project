import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

export const ThemeContext = createContext({
  themeMode: 'system', // 'system', 'light', 'dark'
  setThemeMode: () => {},
  theme: Colors.light,
  isDark: false,
});

const THEME_STORAGE_KEY = '@user_theme_preference';

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useNativeColorScheme();
  const [themeMode, setThemeModeState] = useState('system');

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['system', 'light', 'dark'].includes(savedMode)) {
          setThemeModeState(savedMode);
        }
      } catch (err) {
        console.log('Error loading theme preference:', err.message);
      }
    };
    loadThemePreference();
  }, []);

  const setThemeMode = async (mode) => {
    if (!['system', 'light', 'dark'].includes(mode)) return;
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.log('Error saving theme preference:', err.message);
    }
  };

  const activeScheme = themeMode === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themeMode;

  const theme = Colors[activeScheme] || Colors.light;
  const isDark = activeScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useThemeContext() {
  return useContext(ThemeContext);
}
