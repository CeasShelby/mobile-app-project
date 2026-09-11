// ============================================================
// Authentication API Service
// File: parent-teacher-app/src/services/auth.js
// ============================================================

import { apiRequest } from './api';

/**
 * Authenticates user credentials against backend login endpoint.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>} Token and user profile payload
 */
export async function loginUser(email, password) {
  return await apiRequest('/api/auth/login.php', {
    method: 'POST',
    body: { email, password },
  });
}

/**
 * Fetches authenticated user profile from backend me.php endpoint.
 *
 * @returns {Promise<object>} User profile object
 */
export async function fetchUserProfile() {
  return await apiRequest('/api/auth/me.php', {
    method: 'GET',
  });
}

/**
 * Updates current user password.
 *
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<object>} Success confirmation message
 */
export async function changePassword(currentPassword, newPassword) {
  return await apiRequest('/api/auth/change_password.php', {
    method: 'POST',
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  });
}
