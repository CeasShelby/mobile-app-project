import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { useSync } from '@/context/SyncContext';

export default function ParentLayout() {
  const theme = useTheme();
  const { unreadCounts } = useSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,

        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundElement,
        },
        tabBarActiveTintColor: '#14B8A6',
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarBadgeStyle: {
          backgroundColor: '#FF3B30',
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 'bold',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          lineHeight: Platform.OS === 'ios' ? 20 : 18,
          textAlign: 'center',
          paddingHorizontal: 4,
          borderWidth: 0,
          borderColor: 'transparent',
          overflow: 'hidden',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Student Progress',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance History',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messaging"
        options={{
          title: 'Teacher Chat',
          tabBarLabel: 'Messages',
          tabBarBadge: unreadCounts?.unread_messages > 0 ? unreadCounts.unread_messages : undefined,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Announcements',
          tabBarLabel: 'School Feed',
          tabBarBadge: unreadCounts?.unread_notifications > 0 ? unreadCounts.unread_notifications : undefined,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="student-profile"
        options={{
          title: 'Student Profile & History',
          href: null,
        }}
      />
    </Tabs>
  );
}
