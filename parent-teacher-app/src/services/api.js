// ============================================================
// Centralized API Service Helper
// File: parent-teacher-app/src/services/api.js
// ============================================================

import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic fetch wrapper for communicating with the PHP REST API.
 * Automatically attaches Authorization headers, handles JSON formatting,
 * and processes standardized backend success/error responses.
 *
 * @param {string} endpoint - API route path (e.g., '/api/auth/login.php')
 * @param {object} options - Fetch configuration options (method, body, headers)
 * @returns {Promise<any>} Response data payload
 */
export async function apiRequest(endpoint, options = {}) {
  // 1. Build full request URL
  const url = `${API_URL}${endpoint}`;

  // 2. Retrieve saved JWT session token from AsyncStorage
  const token = await AsyncStorage.getItem('userToken');

  // 3. Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // 4. Attach Bearer token if user is logged in
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 5. Build final fetch request config
  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const result = await response.json();

    if (!response.ok || result.success === false) {
      const errorMessage = result.message || 'An unexpected server error occurred.';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.errors = result.errors;
      throw error;
    }

    return result.data;
  } catch (error) {
    if (error.message === 'Network request failed' || error.name === 'TypeError') {
      throw new Error('Unable to connect to school server. Please check your Wi-Fi or server status.');
    }
    throw error;
  }
}
