import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';

export default function AdminLayout() {
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
        tabBarActiveTintColor: '#FF3B30',
        tabBarInactiveTintColor: theme.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Admin Hub',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'lock.shield.fill', android: 'admin_panel_settings', web: 'admin_panel_settings' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="teachers"
        options={{
          title: 'Manage Teachers',
          tabBarLabel: 'Teachers',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'person.badge.key.fill', android: 'supervisor_account', web: 'supervisor_account' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="parents"
        options={{
          title: 'Manage Parents',
          tabBarLabel: 'Parents',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'person.2.fill', android: 'people', web: 'people' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Manage Students',
          tabBarLabel: 'Students',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'graduationcap.fill', android: 'school', web: 'school' }}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'System Bulletins',
          tabBarLabel: 'Bulletins',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              tintColor={color}
              name={{ ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' }}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
