import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { fetchUnreadCounts, fetchNotifications, markAllNotificationsRead } from '@/services/notifications';

export const SyncContext = createContext({
  unreadCounts: { unread_messages: 0, unread_notifications: 0, total_unread: 0 },
  notifications: [],
  refreshSync: async () => {},
  markNotificationsRead: async () => {},
});

export const SyncProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);
  const [unreadCounts, setUnreadCounts] = useState({
    unread_messages: 0,
    unread_notifications: 0,
    total_unread: 0,
  });
  const [notifications, setNotifications] = useState([]);

  // Fetch unread numbers
  const performSync = async () => {
    if (!token || !user) return;
    try {
      const counts = await fetchUnreadCounts();
      if (counts && typeof counts.unread_messages === 'number') {
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.log('[SyncContext] Sync loop error:', err.message);
    }
  };

  // Mark alerts as read and reset unread badge count to 0
  const markNotificationsRead = async () => {
    if (!token || !user) return;
    try {
      await markAllNotificationsRead();
      setUnreadCounts({
        unread_messages: 0,
        unread_notifications: 0,
        total_unread: 0,
      });
    } catch (err) {
      console.log('[SyncContext] Mark read error:', err.message);
    }
  };

  // Auto-sync polling loop (runs lightweight unread count check every 6 seconds)
  useEffect(() => {
    if (!token || !user) {
      setUnreadCounts({ unread_messages: 0, unread_notifications: 0, total_unread: 0 });
      setNotifications([]);
      return;
    }

    // Initial immediate fetch on login/mount
    performSync();

    // Setup 15-second polling timer (balanced real-time updates without clogging PHP dev server)
    const timerId = setInterval(() => {
      performSync();
    }, 15000);

    return () => {
      clearInterval(timerId);
    };
  }, [token, user]);

  return (
    <SyncContext.Provider
      value={{
        unreadCounts,
        notifications,
        refreshSync: performSync,
        markNotificationsRead,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
