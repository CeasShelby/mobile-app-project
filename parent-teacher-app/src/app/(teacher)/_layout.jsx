import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';

export default function TeacherLayout() {
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
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: theme.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Teacher Home',
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
          title: 'Mark Attendance',
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
          title: 'Log Progress Marks',
          tabBarLabel: 'Log Grades',
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
          title: 'Announcements Board',
          tabBarLabel: 'Post Notice',
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
