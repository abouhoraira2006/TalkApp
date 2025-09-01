type NotificationData = {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: Date;
  read: boolean;
  type?: string;
  senderId?: string;     // ID of the user who triggered the notification
  senderName?: string;   // Name of the user who triggered the notification
  chatId?: string;       // ID of the chat the notification is related to
  messageId?: string;    // ID of the message the notification is about
};

type NotificationCallback = (notifications: NotificationData[]) => void;

class NotificationService {
  private userId: string | null = null;
  private notificationCallbacks: NotificationCallback[] = [];
  private unreadCallbacks: NotificationCallback[] = [];
  private notifications: NotificationData[] = [];

  setUserId(userId: string) {
    this.userId = userId;
    console.log('Setting user ID for notifications:', userId);
    // In a real app, you would subscribe to the user's notifications here
  }

  async createNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const newNotification: NotificationData = {
      ...notification,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false,
    };
    
    this.notifications = [...this.notifications, newNotification];
    this.notifySubscribers();
    
    console.log('Creating notification:', newNotification);
    return Promise.resolve();
  }

  subscribeToNotifications(callback: NotificationCallback): () => void {
    this.notificationCallbacks.push(callback);
    // Initial call with current notifications
    callback(this.notifications);
    
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    };
  }

  subscribeToUnreadNotifications(callback: NotificationCallback): () => void {
    this.unreadCallbacks.push(callback);
    // Initial call with current unread notifications
    callback(this.getUnreadNotifications());
    
    return () => {
      this.unreadCallbacks = this.unreadCallbacks.filter(cb => cb !== callback);
    };
  }

  subscribeToUnreadCount(callback: (count: number) => void): () => void {
    // Create a wrapper that gets the count from the notifications array
    const countCallback = (notifications: NotificationData[]) => {
      const unreadCount = notifications.filter(n => !n.read).length;
      callback(unreadCount);
    };
    
    // Add to notification callbacks
    const unsubscribe = this.subscribeToNotifications(countCallback);
    
    // Initial call
    countCallback(this.notifications);
    
    return () => {
      // This will remove our count callback from the notification callbacks
      unsubscribe();
    };
  }

  private getUnreadNotifications(): NotificationData[] {
    return this.notifications.filter(notification => !notification.read);
  }

  private notifySubscribers() {
    const unread = this.getUnreadNotifications();
    
    // Notify all notification subscribers
    this.notificationCallbacks.forEach(callback => {
      try {
        callback([...this.notifications]);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
    
    // Notify unread subscribers
    this.unreadCallbacks.forEach(callback => {
      try {
        callback([...unread]);
      } catch (error) {
        console.error('Error in unread notification callback:', error);
      }
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    this.notifications = this.notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true } 
        : notification
    );
    this.notifySubscribers();
    return Promise.resolve();
  }

  async markAllAsRead(): Promise<void> {
    this.notifications = this.notifications.map(notification => ({
      ...notification,
      read: true
    }));
    this.notifySubscribers();
    return Promise.resolve();
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifySubscribers();
    return Promise.resolve();
  }

  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    this.notifySubscribers();
    return Promise.resolve();
  }
}

export const notificationService = new NotificationService();

export type { NotificationData };
