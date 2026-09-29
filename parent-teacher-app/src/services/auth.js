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
  return await apiRequest('/auth/login.php', {
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
  return await apiRequest('/auth/me.php', {
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
  return await apiRequest('/auth/change_password.php', {
    method: 'POST',
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  });
}

/**
 * Updates current user profile details (contact info, address, specialization, etc.).
 *
 * @param {object} payload
 * @returns {Promise<object>} Updated user profile object
 */
export async function updateUserProfile(payload) {
  return await apiRequest('/auth/update_profile.php', {
    method: 'POST',
    body: payload,
  });
}
