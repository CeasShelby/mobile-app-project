// ============================================================
// Parent Portal API Service
// File: parent-teacher-app/src/services/parent.js
// ============================================================

import { apiRequest } from './api';

/**
 * Fetches parent dashboard payload from PHP backend REST API (/api/parent/dashboard.php).
 * Includes linked children, attendance summaries, recent grades, and announcements.
 *
 * @returns {Promise<{ parent_name: string, students: Array, announcements: Array }>}
 */
export async function getParentDashboard() {
  return await apiRequest('/api/parent/dashboard.php', {
    method: 'GET',
  });
}

/**
 * Fetches comprehensive student profile, attendance history, academic marks, and teacher details.
 *
 * @param {number} studentId - The ID of the student
 * @returns {Promise<{ student: Object, homeroom_teacher: Object, guardian: Object, attendance: Object, academic: Object }>}
 */
export async function getStudentProfile(studentId) {
  return await apiRequest(`/api/parent/student_profile.php?student_id=${studentId}`, {
    method: 'GET',
  });
}

