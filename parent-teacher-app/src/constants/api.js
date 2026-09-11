import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostIp = () => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  }
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.tool;
  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }
  return '10.40.1.100';
};

export const API_URL = `http://${getHostIp()}:5000`;

