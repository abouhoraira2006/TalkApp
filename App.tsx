import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Import Firebase configuration
import './src/config/firebase';

export type RootStackParamList = {
  MainTabs: undefined;
  Chat: {
    chatId: string;
    otherUser: {
      id: string;
      name: string;
      photoUrl?: string;
    };
  };
  InstagramChat: {
    chatId: string;
    otherUser: {
      id: string;
      name: string;
      photoUrl?: string;
    };
  };
  UserSearch: undefined;
  Login: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

import { useSimpleAuth } from './src/services/simpleAuth';
import { SimpleLoginScreen } from './src/screens/SimpleLoginScreen';
import { SimpleChatListScreen } from './src/screens/SimpleChatListScreen';
import NewInstagramChatScreen from './src/screens/NewInstagramChatScreen';
import UserSearchScreen from './src/screens/UserSearchScreen';
import { NewNotificationsScreen } from './src/screens/NewNotificationsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { NotificationBadge } from './src/components/NotificationBadge';
import { useNotifications } from './src/hooks/useNotifications';


// Tab Navigator Component
const MainTabNavigator = () => {
  const { user } = useSimpleAuth();
  const { unreadCount } = useNotifications(user?.id);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1f2937',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="ChatList"
        component={SimpleChatListScreen}
        options={{
          title: 'المحادثات',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NewNotificationsScreen}
        options={{
          title: 'الإشعارات',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons name="notifications" size={size} color={color} />
              {unreadCount > 0 && (
                <NotificationBadge
                  count={unreadCount}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const { user, loading } = useSimpleAuth();
  const [loginSuccess, setLoginSuccess] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen 
              name="InstagramChat" 
              component={NewInstagramChatScreen}
              options={({ route }) => ({
                title: 'InstagramChat',
              })}
            />
            <Stack.Screen name="UserSearch" component={UserSearchScreen} />
          </>
        ) : (
          <Stack.Screen name="Login">
            {() => <SimpleLoginScreen onLoginSuccess={() => setLoginSuccess(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppContent />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
});
