import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { signOut } from '../services/auth';

interface ProfileScreenProps {
  user: User;
  onSignOut: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onSignOut,
}) => {
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(user.id);
              onSignOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Manage your notifications',
      onPress: () => Alert.alert('Coming Soon', 'Notifications settings will be available soon'),
    },
    {
      icon: 'shield-outline',
      title: 'Privacy & Security',
      subtitle: 'Manage your privacy settings',
      onPress: () => Alert.alert('Coming Soon', 'Privacy settings will be available soon'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => Alert.alert('Coming Soon', 'Help & support will be available soon'),
    },
    {
      icon: 'information-circle-outline',
      title: 'About',
      subtitle: 'App version and information',
      onPress: () => Alert.alert('About', 'TalkApp v1.0.0\nA secure messaging app built with Expo'),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="bg-gray-800 px-4 py-6">
        <View className="items-center">
          <Image
            source={{ uri: user.photoUrl }}
            className="w-24 h-24 rounded-full mb-4"
          />
          <Text className="text-white font-bold text-xl mb-1">
            {user.name}
          </Text>
          <Text className="text-gray-400 text-base">
            {user.email}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <Text className="text-green-400 text-sm">
              {user.online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View className="px-4 py-4">
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={item.onPress}
            className="flex-row items-center py-4 border-b border-gray-700"
          >
            <View className="w-10 h-10 bg-gray-700 rounded-full items-center justify-center mr-3">
              <Ionicons name={item.icon as any} size={20} color="#9ca3af" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                {item.title}
              </Text>
              <Text className="text-gray-400 text-sm">
                {item.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out Button */}
      <View className="px-4 py-6">
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-red-600 rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-semibold text-lg">
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View className="px-4 py-6">
        <Text className="text-gray-500 text-center text-sm">
          TalkApp v1.0.0
        </Text>
        <Text className="text-gray-500 text-center text-xs mt-1">
          Built with Expo & React Native
        </Text>
      </View>
    </ScrollView>
  );
};
