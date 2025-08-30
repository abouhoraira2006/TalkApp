import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Firebase configuration
import './src/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

import { useEmailAuth } from './src/services/auth';
import { LoginScreen as LoginScreenComponent } from './src/screens/LoginScreen';
import ChatListScreenComponent from './src/screens/ChatListScreen';
import ChatScreenComponent from './src/screens/ChatScreen';
import UserSearchScreen from './src/screens/UserSearchScreen';

// Login Screen Component
const LoginScreen = ({ navigation }: any) => {
  const handleLoginSuccess = (userData: any) => {
    navigation.navigate('Main');
  };

  return (
    <LoginScreenComponent onLoginSuccess={handleLoginSuccess} />
  );
};

const ChatListScreen = ({ navigation }: any) => (
  <ChatListScreenComponent navigation={navigation} />
);

const ChatScreen = ({ route, navigation }: any) => (
  <ChatScreenComponent route={route} navigation={navigation} />
);

const SearchScreen = ({ navigation }: any) => (
  <UserSearchScreen navigation={navigation} />
);

const NotificationsScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>الإشعارات</Text>
    <Text style={styles.subtitle}>ستظهر الإشعارات هنا</Text>
  </View>
);

const ProfileScreen = ({ navigation }: any) => {
  const { signOut } = useEmailAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في تسجيل الخروج');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>الملف الشخصي</Text>
      <Text style={styles.subtitle}>إعدادات الحساب</Text>
      
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </View>
  );
};

function MainTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#1f2937',
          borderTopColor: '#374151',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Component with Authentication State Management
const AppContent = () => {
  const { user, loading } = useEmailAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="chatbubbles" size={48} color="#0ea5e9" />
          <Text style={styles.loadingText}>TalkApp</Text>
          <Text style={styles.loadingSubtext}>جاري التحقق من تسجيل الدخول...</Text>
          <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: false
        }}
        initialRouteName={user ? "Main" : "Login"}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="UserSearch" component={SearchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  googleButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    minWidth: 250,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#6b7280',
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
