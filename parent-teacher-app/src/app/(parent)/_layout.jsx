import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';

export default function ParentLayout() {
  const theme = useTheme();

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
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: theme.textSecondary,
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
