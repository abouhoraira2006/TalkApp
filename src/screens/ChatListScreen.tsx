import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chat, User } from '../types';
import { useEmailAuth } from '../services/auth';
import { db } from '../config/firebase';

const ChatListScreen = ({ navigation }: any) => {
  const { user } = useEmailAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = db
      .collection('chats')
      .where('participants', 'array-contains', user.id)
      .orderBy('lastMessageTime', 'desc')
      .onSnapshot(async (snapshot) => {
        const chatList: Chat[] = [];
        
        for (const doc of snapshot.docs) {
          const chatData = doc.data();
          const otherParticipantId = chatData.participants.find((id: string) => id !== user.id);
          
          if (otherParticipantId) {
            try {
              const userDoc = await db.collection('users').doc(otherParticipantId).get();
              const otherUser = userDoc.data() as User;
              
              chatList.push({
                id: doc.id,
                participants: chatData.participants,
                participantDetails: [otherUser],
                lastMessage: chatData.lastMessage,
                lastMessageTime: chatData.lastMessageTime,
                unreadCount: chatData.unreadCount || 0,
              });
            } catch (error) {
              console.error('Error fetching user details:', error);
            }
          }
        }
        
        setChats(chatList);
        setLoading(false);
      });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter((chat) =>
        chat.participantDetails[0]?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.participantDetails[0]?.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  }, [chats, searchQuery]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'أمس';
    } else if (days < 7) {
      return date.toLocaleDateString('ar', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('ar', { day: '2-digit', month: '2-digit' });
    }
  };

  const openChat = (chat: Chat) => {
    navigation.navigate('Chat', {
      chatId: chat.id,
      otherUser: chat.participantDetails[0],
    });
  };

  const startNewChat = () => {
    navigation.navigate('UserSearch');
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherUser = item.participantDetails[0];
    
    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => openChat(item)}>
        <Image
          source={{ uri: otherUser?.photoUrl || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.userName}>{otherUser?.name || 'مستخدم'}</Text>
            <Text style={styles.timestamp}>
              {item.lastMessageTime ? formatTime(item.lastMessageTime) : ''}
            </Text>
          </View>
          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage?.text || 'لا توجد رسائل'}
            </Text>
            {item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.statusContainer}>
          {otherUser?.online ? (
            <View style={styles.onlineIndicator} />
          ) : (
            <Text style={styles.lastSeen}>
              آخر ظهور {formatTime(otherUser?.lastSeen || 0)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="البحث في المحادثات..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyText}>لا توجد محادثات</Text>
            <Text style={styles.emptySubtext}>ابدأ محادثة جديدة بالضغط على الزر أدناه</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={startNewChat}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    textAlign: 'right',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
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
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#9ca3af',
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  lastSeen: {
    color: '#6b7280',
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default ChatListScreen;
