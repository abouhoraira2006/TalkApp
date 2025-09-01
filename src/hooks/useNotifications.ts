import { useState, useEffect } from 'react';
import { notificationService, NotificationData } from '../services/NotificationService';

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // تعيين معرف المستخدم في الخدمة
    notificationService.setUserId(userId);

    // الاستماع لجميع الإشعارات
    const unsubscribeAll = notificationService.subscribeToNotifications((newNotifications) => {
      setNotifications(newNotifications);
      setLoading(false);
    });

    // الاستماع للإشعارات غير المقروءة
    const unsubscribeUnread = notificationService.subscribeToUnreadNotifications((newUnreadNotifications) => {
      setUnreadNotifications(newUnreadNotifications);
    });

    // الاستماع لعدد الإشعارات غير المقروءة
    const unsubscribeCount = notificationService.subscribeToUnreadCount((count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubscribeAll();
      unsubscribeUnread();
      unsubscribeCount();
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
  };

  const deleteNotification = async (notificationId: string) => {
    await notificationService.deleteNotification(notificationId);
  };

  const clearAll = async () => {
    await notificationService.clearAllNotifications();
  };

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
};
