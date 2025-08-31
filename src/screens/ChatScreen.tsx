import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Image,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GiftedChat, IMessage, Bubble } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { useEmailAuth } from '../services/auth';
import { db } from '../config/firebase';
import firebase from '../config/firebase';
import { User } from '../types';

interface ChatScreenProps {
  route: {
    params: {
      chatId?: string;
      otherUser: User;
    };
  };
  navigation: any;
}

const ChatScreen = ({ route, navigation }: ChatScreenProps) => {
  const { user, loading } = useEmailAuth();
  const { chatId: initialChatId, otherUser } = route.params;
  
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputText, setInputText] = useState('');

  const computedChatId = useMemo(() => {
    if (initialChatId) return initialChatId;
    if (user?.id && otherUser?.id) {
      return [user.id, otherUser.id].sort().join('_');
    }
    return null;
  }, [initialChatId, user?.id, otherUser?.id]);

  useEffect(() => {
    if (!computedChatId || !user?.id) return;
    
    let isMounted = true;
    const unsubscribe = db
      .collection('chats')
      .doc(computedChatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        if (!isMounted) return;
        
        const messageList: IMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data && data.user) {
            const message: IMessage = {
              _id: data._id || doc.id,
              text: data.text || '',
              createdAt: data.timestamp ? data.timestamp.toDate() : new Date(),
              user: {
                _id: data.user._id,
                name: data.user.name,
                avatar: data.user.avatar,
              },
            };
            messageList.push(message);
          }
        });
        
        if (isMounted) {
          setMessages(messageList);
        }
      }, (error) => {
        if (isMounted) {
          console.error('Error loading messages:', error);
        }
      });
      
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [computedChatId, user?.id]);

  const onInputTextChanged = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!user || !computedChatId) return;
    
    const message = newMessages[0];
    try {
      const messageData = {
        _id: message._id,
        text: message.text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        user: { 
          _id: user.id, 
          name: user.name, 
          ...(user.photoUrl && { avatar: user.photoUrl }) 
        },
      };
      
      await db.collection('chats').doc(computedChatId).collection('messages').add(messageData);
      await db.collection('chats').doc(computedChatId).set({ 
        participants: [user.id, otherUser.id], 
        lastMessage: message.text, 
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(), 
        lastMessageSender: user.id 
      }, { merge: true });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [user, computedChatId, otherUser.id]);

  const renderHeader = useCallback(() => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1f2937',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'ios' ? 50 : 12,
    }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </TouchableOpacity>
      
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ marginRight: 12 }}>
          {otherUser.photoUrl ? (
            <Image source={{ uri: otherUser.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              backgroundColor: '#374151', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}>
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
                {otherUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
            {otherUser.name}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>
            متصل
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity style={{ marginRight: 16 }}>
          <Ionicons name="videocam" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity>
          <Ionicons name="call" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  ), [navigation, otherUser]);

  const renderInputToolbar = useCallback(() => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#1f2937',
      borderTopWidth: 1,
      borderTopColor: '#374151',
    }}>
      <View style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}>
        <TextInput
          style={{
            flex: 1,
            color: '#ffffff',
            fontSize: 16,
            maxHeight: 100,
          }}
          placeholder="اكتب رسالة..."
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={onInputTextChanged}
          multiline
        />
      </View>
      
      <TouchableOpacity
        style={{
          marginLeft: 12,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#0ea5e9',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={() => {
          if (inputText.trim()) {
            const message: IMessage = {
              _id: Math.random().toString(36).substring(7),
              text: inputText.trim(),
              createdAt: new Date(),
              user: {
                _id: user?.id || '',
                name: user?.name || '',
                ...(user?.photoUrl && { avatar: user.photoUrl }),
              },
            };
            onSend([message]);
            setInputText('');
          }
        }}
      >
        <Ionicons name="send" size={20} color="white" />
      </TouchableOpacity>
    </View>
  ), [inputText, onInputTextChanged, user, onSend]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Text style={{ color: '#ffffff', fontSize: 16 }}>جاري التحميل...</Text>
      </View>
    );
  }
  
  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Text style={{ color: '#ef4444', fontSize: 16, textAlign: 'center' }}>
          يجب تسجيل الدخول أولاً
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#111827' }}>
        {renderHeader()}
        
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <GiftedChat
            messages={messages}
            onSend={onSend}
            user={{
              _id: user.id || '',
              name: user.name || '',
              ...(user.photoUrl && { avatar: user.photoUrl }),
            }}
            renderBubble={(props) => (
              <Bubble
                {...props}
                wrapperStyle={{
                  right: { backgroundColor: '#0ea5e9' },
                  left: { backgroundColor: '#374151' },
                }}
                textStyle={{
                  right: { color: '#ffffff' },
                  left: { color: '#ffffff' },
                }}
              />
            )}
            renderInputToolbar={() => null}
            messagesContainerStyle={{ backgroundColor: '#111827' }}
          />
          
          {renderInputToolbar()}
        </KeyboardAvoidingView>
      </View>
    </GestureHandlerRootView>
  );
};

export default ChatScreen;
