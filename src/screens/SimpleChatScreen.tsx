import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleAuth } from '../services/simpleAuth';
import { db } from '../config/firebase';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  read?: boolean;
}

interface SimpleChatScreenProps {
  route: any;
  navigation: any;
}

export const SimpleChatScreen = ({ route, navigation }: SimpleChatScreenProps) => {
  const { user } = useSimpleAuth();
  const { chatId, otherUser } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!user || !chatId) return;

    const unsubscribe = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        const messageList: Message[] = [];
        snapshot.forEach((doc) => {
          messageList.push({
            id: doc.id,
            ...doc.data(),
          } as Message);
        });
        setMessages(messageList);
      });

    return unsubscribe;
  }, [user, chatId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user) return;

    try {
      const messageData = {
        text: inputText.trim(),
        senderId: user.id,
        senderName: user.name,
        timestamp: Date.now(),
        read: false,
      };

      await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(messageData);

      // Update chat's last message
      await db
        .collection('chats')
        .doc(chatId)
        .update({
          lastMessage: messageData,
          lastMessageTime: Date.now(),
        });

      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <LinearGradient
          colors={isMyMessage ? ['#0ea5e9', '#3b82f6'] : ['#374151', '#4b5563']}
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessage : styles.otherMessage
          ]}
        >
          <Text style={styles.messageText}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatTime(item.timestamp)}
            </Text>
            {isMyMessage && (
              <Ionicons 
                name={item.read ? "checkmark-done" : "checkmark"} 
                size={16} 
                color={item.read ? "#10b981" : "#94a3b8"}
                style={styles.readIcon}
              />
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

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
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            {otherUser?.photoUrl ? (
              <Image source={{ uri: otherUser.photoUrl }} style={styles.headerAvatar} />
            ) : (
              <LinearGradient
                colors={['#0ea5e9', '#3b82f6']}
                style={styles.headerAvatar}
              >
                <Text style={styles.headerAvatarText}>
                  {otherUser?.name?.charAt(0) || 'م'}
                </Text>
              </LinearGradient>
            )}
            
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{otherUser?.name || 'مستخدم غير معروف'}</Text>
              <Text style={styles.userStatus}>
                {isTyping ? 'يكتب...' : 'متصل الآن'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          inverted
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#0ea5e9', '#3b82f6']}
                style={styles.emptyIcon}
              >
                <Ionicons name="chatbubble-outline" size={48} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.emptyText}>ابدأ المحادثة</Text>
              <Text style={styles.emptySubtext}>أرسل أول رسالة لك</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={24} color="#64748b" />
          </TouchableOpacity>
          
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="اكتب رسالة..."
              placeholderTextColor="#64748b"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              textAlign="right"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.sendButton, inputText.trim() && styles.sendButtonActive]} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <LinearGradient
              colors={inputText.trim() ? ['#0ea5e9', '#3b82f6'] : ['#6b7280', '#6b7280']}
              style={styles.sendButtonGradient}
            >
              <Ionicons name="send" size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStatus: {
    color: '#94a3b8',
    fontSize: 14,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myMessage: {
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  readIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
  },
  textInput: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'center',
  },
  sendButton: {
    borderRadius: 20,
  },
  sendButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
