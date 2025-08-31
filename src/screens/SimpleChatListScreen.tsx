import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleAuth } from '../services/simpleAuth';
import { db } from '../config/firebase';

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
  participantNames?: { [key: string]: string };
}

interface SimpleChatListScreenProps {
  navigation: any;
}

export const SimpleChatListScreen = ({ navigation }: SimpleChatListScreenProps) => {
  const { user, signOut } = useSimpleAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<{ [key: string]: any }>({});

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
      .onSnapshot((snapshot) => {
        const chatList: Chat[] = [];
        snapshot.forEach((doc) => {
          chatList.push({
            id: doc.id,
            ...doc.data(),
          } as Chat);
        });
        setChats(chatList);
      });

    return unsubscribe;
  }, [user]);

  const getOtherUser = (chat: Chat) => {
    const otherUserId = chat.participants.find(id => id !== user?.id);
    return otherUserId ? users[otherUserId] : null;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else {
      return date.toLocaleDateString('ar-SA', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherUser = getOtherUser(item);
    const isOnline = otherUser?.online;
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('Chat', { 
          chatId: item.id, 
          otherUser: otherUser || { id: 'unknown', name: 'مستخدم غير معروف' }
        })}
      >
        <View style={styles.avatarContainer}>
          {otherUser?.photoUrl ? (
            <Image source={{ uri: otherUser.photoUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['#0ea5e9', '#3b82f6']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {otherUser?.name?.charAt(0) || 'م'}
              </Text>
            </LinearGradient>
          )}
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {otherUser?.name || 'مستخدم غير معروف'}
            </Text>
            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {formatTime(item.lastMessage.timestamp)}
              </Text>
            )}
          </View>
          
          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage?.text || 'لا توجد رسائل'}
            </Text>
            {item.lastMessage?.senderId === user?.id && (
              <Ionicons name="checkmark-done" size={16} color="#0ea5e9" style={styles.readIcon} />
            )}
          </View>
        </View>
        
        <Ionicons name="chevron-back" size={20} color="#64748b" />
      </TouchableOpacity>
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
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="البحث في المحادثات..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
        </View>
      </LinearGradient>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#0ea5e9', '#3b82f6']}
              style={styles.emptyIcon}
            >
              <Ionicons name="chatbubbles-outline" size={48} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.emptyText}>لا توجد محادثات</Text>
            <Text style={styles.emptySubtext}>ابدأ محادثة جديدة الآن</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'right',
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
  timestamp: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 8,
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
  readIcon: {
    marginLeft: 8,
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
});
