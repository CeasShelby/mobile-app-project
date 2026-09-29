// ============================================================
// API Base URL Configuration
// File: parent-teacher-app/src/constants/api.js
//
// XAMPP Apache Server serves the PHP backend at:
//   http://<your-machine-ip>/parent-teacher-backend
//
// Your machine's LAN Wi-Fi IP: 192.168.0.115
// ============================================================

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PATH = '/parent-teacher-backend';
const FALLBACK_IP = '192.168.0.121';

const getApiUrl = () => {
  // Web browser on the same PC — use localhost
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `http://${window.location.hostname}${BACKEND_PATH}`;
    }
    return `http://localhost${BACKEND_PATH}`;
  }

  // Mobile (Expo Go on phone):
  // Dynamically detect PC's current IP address from Expo's Metro bundler connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.developer?.tool ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const dynamicIp = hostUri.split(':')[0]; // Extracts "192.168.0.121" from "192.168.0.121:8081"
    if (
      dynamicIp &&
      dynamicIp !== 'localhost' &&
      !dynamicIp.includes('127.0.0.1') &&
      !dynamicIp.includes('exp.direct')
    ) {
      const dynamicUrl = `http://${dynamicIp}${BACKEND_PATH}`;
      console.log('[API_URL] Automatically detected current PC IP:', dynamicUrl);
      return dynamicUrl;
    }
  }

  // Fallback IP if Expo manifest is missing
  return `http://${FALLBACK_IP}${BACKEND_PATH}`;
};

export const API_URL = getApiUrl();

console.log('[API_URL] Final API_URL =', API_URL);
