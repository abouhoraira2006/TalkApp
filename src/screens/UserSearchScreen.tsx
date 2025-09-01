import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { useEmailAuth } from '../services/auth';
import { db } from '../config/firebase';

const UserSearchScreen = ({ navigation }: any) => {
  const { user } = useEmailAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers([]);
    } else {
      const filtered = users.filter((u) =>
        u.id !== user?.id &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         u.username.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users, user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await db.collection('users').get();
      const userList: User[] = [];
      
      snapshot.docs.forEach((doc) => {
        const userData = doc.data() as User;
        if (userData.id !== user?.id) {
          userList.push(userData);
        }
      });
      
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('خطأ', 'فشل في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (otherUser: User) => {
    if (!user) {
      Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
      return;
    }

    console.log('Starting chat with:', otherUser.name);
    console.log('Current user:', user.name);

    try {
      // Check if chat already exists
      const chatQuery = await db.collection('chats')
        .where('participants', 'array-contains', user.id)
        .get();

      let existingChatId: string | null = null;
      
      chatQuery.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.participants.includes(otherUser.id)) {
          existingChatId = doc.id;
        }
      });

      let chatId: string = existingChatId || '';

      // If no existing chat, create a new one
      if (!chatId) {
        console.log('Creating new chat...');
        const newChatRef = await db.collection('chats').add({
          participants: [user.id, otherUser.id],
          createdAt: Date.now(),
          lastMessage: '',
          lastMessageTime: Date.now(),
          unreadCount: {
            [user.id]: 0,
            [otherUser.id]: 0,
          },
        });
        chatId = newChatRef.id;
        console.log('New chat created with ID:', chatId);
      } else {
        console.log('Using existing chat ID:', chatId);
      }
      
      // Navigate to chat screen
      navigation.navigate('InstagramChat', {
        chatId: chatId,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          photoUrl: otherUser.photoUrl,
        },
      });
      
      console.log('Navigation completed successfully');
      
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('خطأ', 'فشل في فتح المحادثة');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem} 
      onPress={() => {
        console.log('User item pressed:', item.name);
        startChat(item);
      }}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.photoUrl || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.username}>@{item.username}</Text>
        <View style={styles.statusContainer}>
          {item.online ? (
            <View style={styles.onlineIndicator} />
          ) : (
            <Text style={styles.lastSeen}>
              آخر ظهور {formatTime(item.lastSeen)}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chatbubble-outline" size={24} color="#0ea5e9" />
    </TouchableOpacity>
  );

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>بحث عن مستخدمين</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="البحث بالاسم أو اسم المستخدم..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        style={styles.userList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {searchQuery.trim() === '' ? (
              <>
                <Ionicons name="search" size={64} color="#6b7280" />
                <Text style={styles.emptyText}>ابدأ البحث</Text>
                <Text style={styles.emptySubtext}>اكتب اسم المستخدم أو الاسم للبحث</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-outline" size={64} color="#6b7280" />
                <Text style={styles.emptyText}>لا توجد نتائج</Text>
                <Text style={styles.emptySubtext}>جرب كلمات بحث مختلفة</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
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
  clearButton: {
    marginLeft: 8,
  },
  userList: {
    flex: 1,
  },
  userItem: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  lastSeen: {
    color: '#6b7280',
    fontSize: 12,
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
});

export default UserSearchScreen;
