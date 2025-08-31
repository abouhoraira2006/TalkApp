import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import Firebase configuration
import './src/config/firebase';

const Stack = createStackNavigator();

import { useSimpleAuth } from './src/services/simpleAuth';
import { SimpleLoginScreen } from './src/screens/SimpleLoginScreen';
import { SimpleChatListScreen } from './src/screens/SimpleChatListScreen';
import { InstagramChatScreen } from './src/screens/InstagramChatScreen';
import UserSearchScreen from './src/screens/UserSearchScreen';


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
            <Stack.Screen name="ChatList" component={SimpleChatListScreen} />
            <Stack.Screen name="Chat" component={InstagramChatScreen} />
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
