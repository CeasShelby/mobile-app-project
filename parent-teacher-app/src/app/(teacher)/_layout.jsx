import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { TeacherClassProvider } from '@/context/TeacherClassContext';
import { useSync } from '@/context/SyncContext';

function TeacherTabs() {
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
          title: 'Teacher Home (S.1–S.6)',
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
        name="attendance"
        options={{
          title: 'Roll-Call Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'checkmark.circle.fill', android: 'fact_check', web: 'fact_check' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Assessment Marks',
          tabBarLabel: 'Marks & Progress',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'plus.square.fill', android: 'add_chart', web: 'add_chart' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messaging"
        options={{
          title: 'Parent Chat Inbox',
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
          title: 'School Noticeboard',
          tabBarLabel: 'Notices',
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
    </Tabs>
  );
}

export default function TeacherLayout() {
  return (
    <TeacherClassProvider>
      <TeacherTabs />
    </TeacherClassProvider>
  );
}
