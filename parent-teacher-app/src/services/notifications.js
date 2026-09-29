// ============================================================
// Real-Time Notification & Messaging Sync Service
// File: parent-teacher-app/src/services/notifications.js
// Rationale: Provides functions to poll unread counts, retrieve event notifications, and clear unread flags
// ============================================================

import { apiRequest } from './api';

/**
 * Fetch unread counts for messages and notifications
 * Returns { unread_messages, unread_notifications, total_unread }
 */
export async function fetchUnreadCounts() {
  try {
    const data = await apiRequest('/notifications/get_unread_counts.php');
    return data;
  } catch (error) {
    console.log('[SyncService] Fetch unread counts error:', error.message);
    return { unread_messages: 0, unread_notifications: 0, total_unread: 0 };
  }
}

/**
 * Fetch recent event notifications list for current logged in user
 * @param {string|null} typeFilter Optional filter: 'attendance', 'result', 'announcement', 'message'
 * @param {boolean} markRead Optional flag to mark retrieved notifications as read
 */
export async function fetchNotifications(typeFilter = null, markRead = false) {
  try {
    let endpoint = '/notifications/get_notifications.php';
    const queryParams = [];

    if (typeFilter) {
      queryParams.push(`type=${encodeURIComponent(typeFilter)}`);
    }
    if (markRead) {
      queryParams.push('mark_read=1');
    }

    if (queryParams.length > 0) {
      endpoint += '?' + queryParams.join('&');
    }

    const data = await apiRequest(endpoint);
    // Backend returns { notifications: [...], unread_count: N }
    // Extract array for backward compatibility with components that expect an array
    if (data && Array.isArray(data.notifications)) {
      return data.notifications;
    }
    // Fallback: if somehow data is already an array (legacy)
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log('[SyncService] Fetch notifications error:', error.message);
    return [];
  }
}

/**
 * Fetch recent message previews (contacts list with last message snippet)
 * for use in the Messages pop-up panel.
 * NOTE: get_contacts.php uses the legacy auth middleware and returns a raw JSON
 * array (not the standardized { success, data } wrapper), so we bypass apiRequest.
 */
export async function fetchMessagePreviews() {
  try {
    // Import AsyncStorage inline to avoid circular dependency issues
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { API_URL } = await import('@/constants/api');
    const token = await AsyncStorage.getItem('userToken');

    const response = await fetch(`${API_URL}/messaging/get_contacts.php`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) return [];

    const contacts = await response.json();
    if (!Array.isArray(contacts)) return [];

    // Map contacts into the generic { id, title, content, created_at } shape
    // that NotificationPopupModal expects
    return contacts.map((c) => ({
      id: `msg-contact-${c.contact_user_id}`,
      title: c.full_name || 'Unknown',
      content: c.last_message || 'No messages yet — tap to start a conversation.',
      created_at: c.last_message_time || null,
      type: 'chat',
      unread_count: c.unread_count || 0,
    }));
  } catch (error) {
    console.log('[SyncService] Fetch message previews error:', error.message);
    return [];
  }
}

/**
 * Mark all notifications and unread messages as read for the logged in user
 */
export async function markAllNotificationsRead() {
  try {
    const data = await apiRequest('/notifications/mark_all_read.php', {
      method: 'POST',
    });
    return data;
  } catch (error) {
    console.log('[SyncService] Mark all read error:', error.message);
    return null;
  }
}
