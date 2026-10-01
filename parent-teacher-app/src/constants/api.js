// ============================================================
// API Base URL Configuration — LOCAL XAMPP ONLY
// File: parent-teacher-app/src/constants/api.js
//
// This app connects ONLY to your local XAMPP Apache server.
// XAMPP must be running on your PC with Apache + MySQL ON.
// ============================================================

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PATH = '/parent-teacher-backend/api';

const getApiUrl = () => {
  // On web browser (PC), use localhost directly
  if (Platform.OS === 'web') {
    return `http://localhost${BACKEND_PATH}`;
  }

  // On mobile (Expo Go on phone):
  // Reads your PC's current IP from Metro bundler automatically
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.developer?.tool ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && !ip.includes('127.0.0.1') && !ip.includes('exp.direct')) {
      const url = `http://${ip}${BACKEND_PATH}`;
      console.log('[LOCAL API] Auto-detected PC IP:', url);
      return url;
    }
  }

  // Manual fallback: update this to match your PC's Wi-Fi IP if auto-detect fails
  // Find your IP: open Command Prompt → type ipconfig → look for IPv4 Address
  const FALLBACK_IP = '192.168.0.121';
  console.log('[LOCAL API] Using fallback IP:', FALLBACK_IP);
  return `http://${FALLBACK_IP}${BACKEND_PATH}`;
};

export const API_URL = getApiUrl();
export const RENDER_API_URL = null; // NOT USED — local XAMPP only

console.log('[LOCAL API] Final API_URL =', API_URL);
