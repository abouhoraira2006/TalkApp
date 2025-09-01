import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  StatusBar,
  Modal,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSimpleAuth } from '../services/simpleAuth';
import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';

const { width: screenWidth } = Dimensions.get('window');

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
  participantNames?: { [key: string]: string };
  lastMessageTime?: number;
  unreadCount?: { [key: string]: number };
  createdAt?: number;
  pinned?: { [key: string]: boolean };
  locked?: { [key: string]: boolean };
}

interface SimpleChatListScreenProps {
  navigation: any;
}

const SimpleChatListScreen = ({ navigation }: SimpleChatListScreenProps) => {
  const { user, signOut } = useSimpleAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<{ [key: string]: any }>({});
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [lockedChatToOpen, setLockedChatToOpen] = useState<Chat | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!user) return;

    // Load all users for name mapping
    const loadUsers = async () => {
      const usersSnapshot = await db.collection('users').get();
      const usersMap: { [key: string]: any } = {};
      usersSnapshot.forEach((doc) => {
        usersMap[doc.id] = doc.data();
      });
      setUsers(usersMap);
    };

    loadUsers();

    const unsubscribe = db
      .collection('chats')
      .where('participants', 'array-contains', user.id)
      .orderBy('lastMessageTime', 'desc')
      .onSnapshot(async (snapshot) => {
        const chatList: Chat[] = [];
        
        for (const doc of snapshot.docs) {
          const chatData = doc.data() as Chat;
          
          // Get the last message from the messages subcollection
          try {
            const lastMessageSnapshot = await db
              .collection('chats')
              .doc(doc.id)
              .collection('messages')
              .orderBy('timestamp', 'desc')
              .limit(1)
              .get();
            
            let lastMessage = null;
            if (!lastMessageSnapshot.empty) {
              const messageDoc = lastMessageSnapshot.docs[0];
              const messageData = messageDoc.data();
              lastMessage = {
                text: messageData.text || '',
                timestamp: messageData.timestamp || Date.now(),
                senderId: messageData.senderId || ''
              };
            }
            
            chatList.push({
              id: doc.id,
              ...chatData,
              lastMessage: lastMessage || chatData.lastMessage
            } as Chat);
          } catch (error) {
            console.error('Error fetching last message:', error);
            chatList.push({
              id: doc.id,
              ...chatData,
            } as Chat);
          }
        }
        
        // Sort chats: pinned first, then by lastMessageTime
        const sortedChats = chatList.sort((a, b) => {
          const aPinned = a.pinned?.[user.id] || false;
          const bPinned = b.pinned?.[user.id] || false;
          
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          
          return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
        });
        
        setChats(sortedChats);
      });

    return unsubscribe;
  }, [user]);

  const getOtherUser = (chat: Chat) => {
    const otherUserId = chat.participants.find(id => id !== user?.id);
    return otherUserId ? users[otherUserId] : null;
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) {
      return 'الآن';
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'الآن';
    }
    
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return 'الآن';
    } else if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} د`;
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('ar', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffInDays === 1) {
      return 'أمس';
    } else if (diffInDays < 7) {
      return `منذ ${diffInDays} أيام`;
    } else {
      return date.toLocaleDateString('ar', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Generate avatar colors based on name
  const getAvatarColors = (name: string): [string, string] => {
    const colors: [string, string][] = [
      ['#0ea5e9', '#3b82f6'], // Blue
      ['#10b981', '#059669'], // Green
      ['#f59e0b', '#d97706'], // Orange
      ['#ef4444', '#dc2626'], // Red
      ['#8b5cf6', '#7c3aed'], // Purple
      ['#06b6d4', '#0891b2'], // Cyan
      ['#84cc16', '#65a30d'], // Lime
      ['#f97316', '#ea580c'], // Orange
      ['#ec4899', '#db2777'], // Pink
      ['#6366f1', '#4f46e5'], // Indigo
    ];
    
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Generate avatar initials
  const getAvatarInitials = (name: string) => {
    if (!name || name.trim() === '') return 'م';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  };

  // Format display message with sender prefix and length limit
  const getDisplayMessage = (lastMessage: any, currentUserId?: string) => {
    if (!lastMessage?.text) {
      return 'لا توجد رسائل';
    }

    const maxLength = 35;
    let messageText = lastMessage.text;
    
    // Truncate long messages
    if (messageText.length > maxLength) {
      messageText = messageText.substring(0, maxLength) + '...';
    }
    
    // Add sender prefix
    if (lastMessage.senderId === currentUserId) {
      return `أنت: ${messageText}`;
    }
    
    return messageText;
  };

  const togglePinChat = async (chatId: string) => {
    if (!user) return;
    
    try {
      const chatRef = db.collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();
      const currentPinned = chatDoc.data()?.pinned?.[user.id] || false;
      
      await chatRef.update({
        [`pinned.${user.id}`]: !currentPinned
      });
      
      Alert.alert(
        currentPinned ? 'تم إلغاء التثبيت' : 'تم التثبيت',
        currentPinned ? 'تم إلغاء تثبيت المحادثة' : 'تم تثبيت المحادثة في الأعلى'
      );
    } catch (error) {
      console.error('Error toggling pin:', error);
      Alert.alert('خطأ', 'فشل في تثبيت المحادثة');
    }
  };

  const toggleLockChat = async (chatId: string) => {
    if (!user) return;
    
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    const currentLocked = chatDoc.data()?.locked?.[user.id] || false;
    
    if (currentLocked) {
      // Unlock chat
      try {
        await chatRef.update({
          [`locked.${user.id}`]: false
        });
        Alert.alert('تم إلغاء القفل', 'تم إلغاء قفل المحادثة');
      } catch (error) {
        console.error('Error unlocking chat:', error);
        Alert.alert('خطأ', 'فشل في إلغاء قفل المحادثة');
      }
    } else {
      // Lock chat - ask for password
      Alert.prompt(
        'قفل المحادثة',
        'أدخل كلمة مرور لقفل هذه المحادثة',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'قفل',
            onPress: async (password) => {
              if (password && password.length >= 4) {
                try {
                  await chatRef.update({
                    [`locked.${user.id}`]: true,
                    [`lockPassword.${user.id}`]: password
                  });
                  Alert.alert('تم القفل', 'تم قفل المحادثة بنجاح');
                } catch (error) {
                  console.error('Error locking chat:', error);
                  Alert.alert('خطأ', 'فشل في قفل المحادثة');
                }
              } else {
                Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
              }
            }
          }
        ],
        'secure-text'
      );
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await db.collection('chats').doc(chatId).delete();
      Alert.alert('تم الحذف', 'تم حذف المحادثة بنجاح');
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('خطأ', 'فشل في حذف المحادثة');
    }
  };

  const muteChat = async (chatId: string) => {
    try {
      await db.collection('chats').doc(chatId).update({
        [`muted.${user?.id}`]: true
      });
      Alert.alert('تم كتم الصوت', 'تم كتم المحادثة');
    } catch (error) {
      console.error('Error muting chat:', error);
    }
  };

  const markAsRead = async (chatId: string) => {
    try {
      await db.collection('chats').doc(chatId).update({
        [`unreadCount.${user?.id}`]: 0
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const createGestureHandler = (chatId: string) => {
    const translateX = new Animated.Value(0);
    
    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: any, chat: Chat) => {
      if (event.nativeEvent.state === State.END) {
        const translationX = event.nativeEvent.translationX;
        if (translationX > 100) {
          // Swipe right - Mark as read
          markAsRead(chatId);
        } else if (translationX < -100) {
          // Swipe left - Show options
          setSelectedChat(chat);
          setShowActionModal(true);
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    };

    return { onGestureEvent, onHandlerStateChange, translateX };
  };

  const handleChatPress = async (item: Chat) => {
    const isLocked = item.locked?.[user?.id || ''] || false;
    
    if (isLocked) {
      setLockedChatToOpen(item);
      setShowPasswordModal(true);
    } else {
      markAsRead(item.id);
      const otherUser = getOtherUser(item);
      navigation.navigate('InstagramChat', { 
        chatId: item.id, 
        otherUser: otherUser || { id: 'unknown', name: 'مستخدم غير معروف' }
      });
    }
  };

  const handlePasswordSubmit = async () => {
    if (!lockedChatToOpen || !user) return;
    
    try {
      const chatDoc = await db.collection('chats').doc(lockedChatToOpen.id).get();
      const savedPassword = chatDoc.data()?.lockPassword?.[user.id];
      
      if (passwordInput === savedPassword) {
        setShowPasswordModal(false);
        setPasswordInput('');
        markAsRead(lockedChatToOpen.id);
        const otherUser = getOtherUser(lockedChatToOpen);
        navigation.navigate('InstagramChat', { 
          chatId: lockedChatToOpen.id, 
          otherUser: otherUser || { id: 'unknown', name: 'مستخدم غير معروف' }
        });
        setLockedChatToOpen(null);
      } else {
        Alert.alert('خطأ', 'كلمة المرور غير صحيحة');
      }
    } catch (error) {
      console.error('Error checking password:', error);
      Alert.alert('خطأ', 'حدث خطأ في التحقق من كلمة المرور');
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherUser = getOtherUser(item);
    const isOnline = otherUser?.online;
    const unreadCount = item.unreadCount?.[user?.id || ''] || 0;
    const isPinned = item.pinned?.[user?.id || ''] || false;
    const isLocked = item.locked?.[user?.id || ''] || false;
    const { onGestureEvent, onHandlerStateChange, translateX } = createGestureHandler(item.id);
    
    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={(event) => onHandlerStateChange(event, item)}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          <TouchableOpacity
            style={[
              styles.chatItem, 
              unreadCount > 0 && styles.unreadChatItem,
              isPinned && styles.pinnedChatItem
            ]}
            onPress={() => handleChatPress(item)}
            onLongPress={() => {
              setSelectedChat(item);
              setShowActionModal(true);
            }}
          >
            <View style={styles.avatarContainer}>
              {otherUser?.photoUrl && otherUser.photoUrl.trim() !== '' ? (
                <Image source={{ uri: otherUser.photoUrl }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={getAvatarColors(otherUser?.name || 'مستخدم')}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {getAvatarInitials(otherUser?.name || 'مستخدم')}
                  </Text>
                </LinearGradient>
              )}
              {isOnline && <View style={styles.onlineIndicator} />}
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <View style={styles.chatNameContainer}>
                  {isPinned && <Ionicons name="pin" size={14} color="#f59e0b" style={styles.pinIcon} />}
                  {isLocked && <Ionicons name="lock-closed" size={14} color="#ef4444" style={styles.lockIcon} />}
                  <Text style={[styles.chatName, unreadCount > 0 && styles.unreadChatName]} numberOfLines={1}>
                    {otherUser?.name || 'مستخدم غير معروف'}
                  </Text>
                </View>
                {(item.lastMessage?.timestamp || item.lastMessageTime) && (
                  <Text style={[styles.timestamp, unreadCount > 0 && styles.unreadTimestamp]}>
                    {formatTime(item.lastMessage?.timestamp || item.lastMessageTime || Date.now())}
                  </Text>
                )}
              </View>
              
              <View style={styles.messageRow}>
                <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadLastMessage]} numberOfLines={1}>
                  {getDisplayMessage(item.lastMessage, user?.id)}
                </Text>
                {item.lastMessage?.senderId === user?.id && (
                  <Ionicons name="checkmark-done" size={16} color="#0ea5e9" style={styles.readIcon} />
                )}
              </View>
            </View>
            
            <View style={styles.chatActions}>
              <Ionicons name="chevron-back" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const filteredChats = chats.filter(chat => {
    const otherUser = getOtherUser(chat);
    return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>يجب تسجيل الدخول أولاً</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      
      <LinearGradient
        colors={['#1e293b', '#334155']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={signOut} style={styles.profileButton}>
            <Ionicons name="log-out-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>المحادثات</Text>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
          <Ionicons name="search" size={20} color={isSearchFocused ? "#0ea5e9" : "#64748b"} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="البحث في المحادثات والرسائل..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            textAlign="right"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setTimeout(() => setRefreshing(false), 1000);
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#0ea5e9', '#3b82f6']}
              style={styles.emptyIcon}
            >
              <Ionicons name={searchQuery ? "search-outline" : "chatbubbles-outline"} size={48} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.emptyText}>
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد محادثات'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'جرب البحث بكلمات مختلفة' : 'ابدأ محادثة جديدة الآن'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('UserSearch')}
      >
        <LinearGradient
          colors={['#0ea5e9', '#3b82f6']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>خيارات المحادثة</Text>
              <Text style={styles.modalSubtitle}>
                {selectedChat && getOtherUser(selectedChat)?.name}
              </Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  if (selectedChat) markAsRead(selectedChat.id);
                  setShowActionModal(false);
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={[styles.actionText, { color: '#10b981' }]}>تعيين كمقروءة</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  if (selectedChat) togglePinChat(selectedChat.id);
                  setShowActionModal(false);
                }}
              >
                <Ionicons 
                  name={selectedChat?.pinned?.[user?.id || ''] ? "pin" : "pin-outline"} 
                  size={24} 
                  color="#f59e0b" 
                />
                <Text style={[styles.actionText, { color: '#f59e0b' }]}>
                  {selectedChat?.pinned?.[user?.id || ''] ? 'إلغاء التثبيت' : 'تثبيت المحادثة'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  if (selectedChat) toggleLockChat(selectedChat.id);
                  setShowActionModal(false);
                }}
              >
                <Ionicons 
                  name={selectedChat?.locked?.[user?.id || ''] ? "lock-open" : "lock-closed"} 
                  size={24} 
                  color="#8b5cf6" 
                />
                <Text style={[styles.actionText, { color: '#8b5cf6' }]}>
                  {selectedChat?.locked?.[user?.id || ''] ? 'إلغاء القفل' : 'قفل المحادثة'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setShowActionModal(false);
                  Alert.alert('قريباً', 'هذه الميزة ستكون متاحة قريباً');
                }}
              >
                <Ionicons name="notifications-off" size={24} color="#64748b" />
                <Text style={[styles.actionText, { color: '#64748b' }]}>كتم الإشعارات</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setShowActionModal(false);
                  if (selectedChat) {
                    Alert.alert(
                      'حذف المحادثة',
                      'هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.',
                      [
                        { text: 'إلغاء', style: 'cancel' },
                        { 
                          text: 'حذف', 
                          style: 'destructive',
                          onPress: () => deleteChat(selectedChat.id)
                        }
                      ]
                    );
                  }
                }}
              >
                <Ionicons name="trash" size={24} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>حذف المحادثة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.actionModal, { paddingTop: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>أدخل كلمة المرور</Text>
              <Text style={styles.modalSubtitle}>هذه المحادثة محمية بكلمة مرور</Text>
            </View>
            
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
              <TextInput
                style={{
                  backgroundColor: '#334155',
                  borderRadius: 12,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  textAlign: 'center',
                }}
                placeholder="كلمة المرور"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                autoFocus
              />
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setLockedChatToOpen(null);
                }}
              >
                <Ionicons name="close" size={24} color="#64748b" />
                <Text style={[styles.actionText, { color: '#64748b' }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handlePasswordSubmit}
              >
                <Ionicons name="lock-open" size={24} color="#0ea5e9" />
                <Text style={[styles.actionText, { color: '#0ea5e9' }]}>فتح</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1c',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainerFocused: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'right',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 4,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unreadChatItem: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  unreadChatName: {
    fontWeight: '700',
    color: '#ffffff',
  },
  timestamp: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 8,
  },
  unreadTimestamp: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  unreadLastMessage: {
    color: '#e2e8f0',
    fontWeight: '500',
  },
  readIcon: {
    marginLeft: 8,
  },
  chatActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    elevation: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  actionModal: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  actionButtons: {
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  pinnedChatItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  chatNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinIcon: {
    marginRight: 6,
  },
  lockIcon: {
    marginRight: 6,
  },
});

export { SimpleChatListScreen };
export default SimpleChatListScreen;
