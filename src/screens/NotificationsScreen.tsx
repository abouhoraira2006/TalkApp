import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../types';
import { formatTime } from '../utils/formatTime';

interface NotificationsScreenProps {
  onBack?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    // Mock notifications for now
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Welcome to TalkApp!',
        message: 'You have successfully signed in to your account.',
        type: 'system',
        timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
        read: false,
      },
      {
        id: '2',
        title: 'New Feature Available',
        message: 'Voice messages are now supported in all chats.',
        type: 'update',
        timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        read: true,
      },
      {
        id: '3',
        title: 'Security Update',
        message: 'Your account security has been enhanced with the latest updates.',
        type: 'system',
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
        read: true,
      },
    ];

    setNotifications(mockNotifications);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return 'chatbubble-outline';
      case 'system':
        return 'information-circle-outline';
      case 'update':
        return 'refresh-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return '#0ea5e9';
      case 'system':
        return '#10b981';
      case 'update':
        return '#f59e0b';
      default:
        return '#9ca3af';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => markAsRead(item.id)}
      className={`flex-row items-start px-4 py-3 border-b border-gray-700 ${
        !item.read ? 'bg-gray-800' : ''
      }`}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: getNotificationColor(item.type) + '20' }}
      >
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={20}
          color={getNotificationColor(item.type)}
        />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-semibold text-base">
            {item.title}
          </Text>
          {!item.read && (
            <View className="w-2 h-2 bg-primary-600 rounded-full" />
          )}
        </View>
        <Text className="text-gray-400 text-sm mt-1">
          {item.message}
        </Text>
        <Text className="text-gray-500 text-xs mt-2">
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-gray-800 border-b border-gray-700">
        {onBack && (
          <TouchableOpacity onPress={onBack} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text className="text-white font-semibold text-lg">Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9ca3af"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Ionicons name="notifications-outline" size={64} color="#6b7280" />
            <Text className="text-gray-400 text-lg mt-4 text-center">
              No notifications
            </Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              You're all caught up!
            </Text>
          </View>
        }
      />
    </View>
  );
};
