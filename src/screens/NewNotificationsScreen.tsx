import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleAuth } from '../services/simpleAuth';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationData } from '../services/NotificationService';
import { NotificationBadge } from '../components/NotificationBadge';

interface NewNotificationsScreenProps {
  navigation?: any;
}

export const NewNotificationsScreen: React.FC<NewNotificationsScreenProps> = ({
  navigation,
}) => {
  const { user } = useSimpleAuth();
  const {
    notifications,
    unreadNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'messages'>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    // البيانات تتحدث تلقائياً عبر الـ hooks
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getFilteredNotifications = () => {
    switch (selectedFilter) {
      case 'unread':
        return unreadNotifications;
      case 'messages':
        return notifications.filter(n => n.type === 'message');
      default:
        return notifications;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'system':
        return 'information-circle';
      case 'call':
        return 'call';
      case 'group':
        return 'people';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: NotificationData['type']) => {
    switch (type) {
      case 'message':
        return '#0ea5e9';
      case 'system':
        return '#10b981';
      case 'call':
        return '#f59e0b';
      case 'group':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    // تعيين كمقروءة
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // التنقل حسب نوع الإشعار
    if (notification.type === 'message' && notification.chatId) {
      navigation?.navigate('InstagramChat', { 
        chatId: notification.chatId,
        otherUser: {
          id: notification.senderId,
          name: notification.senderName,
          photoUrl: '',
        }
      });
    }
  };

  const handleLongPress = (notification: NotificationData) => {
    Alert.alert(
      'خيارات الإشعار',
      '',
      [
        {
          text: notification.read ? 'تعيين كغير مقروء' : 'تعيين كمقروء',
          onPress: () => markAsRead(notification.id),
        },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => deleteNotification(notification.id),
        },
        {
          text: 'إلغاء',
          style: 'cancel',
        },
      ]
    );
  };

  const renderNotification = ({ item }: { item: NotificationData }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleLongPress(item)}
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
      ]}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.leftSection}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getNotificationColor(item.type) + '20' },
              ]}
            >
              <Ionicons
                name={getNotificationIcon(item.type) as any}
                size={20}
                color={getNotificationColor(item.type)}
              />
            </View>
            
            {item.senderAvatar && (
              <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
            )}
          </View>

          <View style={styles.textSection}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.timestamp}>
              {formatTime(item.timestamp)}
            </Text>
          </View>

          <View style={styles.rightSection}>
            {!item.read && <View style={styles.unreadDot} />}
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['#1e293b', '#334155']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>الإشعارات</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.actionButton}
            >
              <Ionicons name="checkmark-done" size={20} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'حذف جميع الإشعارات',
                  'هل أنت متأكد؟',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'حذف', style: 'destructive', onPress: clearAll },
                  ]
                );
              }}
              style={styles.actionButton}
            >
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {[
            { key: 'all', label: 'الكل', count: notifications.length },
            { key: 'unread', label: 'غير مقروء', count: unreadCount },
            { key: 'messages', label: 'الرسائل', count: notifications.filter(n => n.type === 'message').length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setSelectedFilter(filter.key as any)}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.activeFilterTab,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.key && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
              {filter.count > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{filter.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </View>
  );

  const filteredNotifications = getFilteredNotifications();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e293b" barStyle="light-content" />
      
      {renderHeader()}

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
            colors={['#0ea5e9']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={selectedFilter === 'unread' ? 'checkmark-circle' : 'notifications-outline'} 
              size={64} 
              color="#6b7280" 
            />
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'unread' ? 'جميع إشعاراتك مقروءة!' : 'ستظهر الإشعارات هنا'}
            </Text>
          </View>
        }
        contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeFilterTab: {
    backgroundColor: '#ffffff',
  },
  filterText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#1e293b',
  },
  filterBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationItem: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unreadNotification: {
    backgroundColor: '#1e3a8a',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -16,
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  textSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyList: {
    flex: 1,
  },
  emptyTitle: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
