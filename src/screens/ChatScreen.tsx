import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  ActionSheetIOS,
  TextInput,
} from 'react-native';
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GiftedChat, IMessage, Bubble } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { useEmailAuth } from '../services/auth';
import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';
import { User } from '../types';
import { Audio } from 'expo-av';

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
  const { user } = useEmailAuth();
  const { chatId: initialChatId, otherUser } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState<string | null>(initialChatId || null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  // New states for advanced features
  const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<IMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<IMessage | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // Create or get chat ID
  useEffect(() => {
    if (!chatId && user) {
      const newChatId = [user.id, otherUser.id].sort().join('_');
      setChatId(newChatId);
    }
  }, [user, otherUser.id, chatId]);

  // Load messages
  useEffect(() => {
    if (!chatId || !user) return;

    const unsubscribe = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
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
              ...(data.image && { image: data.image }),
              ...(data.audio && { audio: data.audio }),
              ...((data as any).replyTo && { replyTo: (data as any).replyTo }),
              ...((data as any).reactions && { reactions: (data as any).reactions }),
              ...((data as any).isDeleted && { isDeleted: (data as any).isDeleted }),
              ...((data as any).isEdited && { isEdited: (data as any).isEdited }),
            };
            messageList.push(message);
          }
        });
        setMessages(messageList);
      }, (error) => {
        console.error('Error loading messages:', error);
        Alert.alert('خطأ', 'فشل في تحميل الرسائل');
      });

    return unsubscribe;
  }, [chatId, user]);

  // Monitor online status and typing
  useEffect(() => {
    if (!chatId || !user) return;

    // Set user online
    const userStatusRef = db.collection('userStatus').doc(user.id);
    userStatusRef.set({
      isOnline: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Monitor other user's status
    const otherUserStatusRef = db.collection('userStatus').doc(otherUser.id);
    const unsubscribeStatus = otherUserStatusRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        setIsOnline(data?.isOnline || false);
        setLastSeen(data?.lastSeen?.toDate() || null);
      }
    });

    // Monitor typing status
    const typingRef = db.collection('chats').doc(chatId).collection('typing').doc(otherUser.id);
    const unsubscribeTyping = typingRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        setOtherUserTyping(data?.isTyping || false);
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeTyping();
      userStatusRef.set({
        isOnline: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    };
  }, [chatId, user, otherUser.id]);

  const onInputTextChanged = useCallback((text: string) => {
    setInputText(text);
    
    if (!chatId || !user) return;

    const typingRef = db.collection('chats').doc(chatId).collection('typing').doc(user.id);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      typingRef.set({ isTyping: true });
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      typingRef.delete();
    }
  }, [chatId, user, isTyping]);

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const renderHeader = () => (
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
          {isOnline && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#10b981',
              borderWidth: 2,
              borderColor: '#1f2937',
            }} />
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
            {otherUser.name}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>
            {otherUserTyping ? 'يكتب...' : (isOnline ? 'متصل' : (lastSeen ? `آخر ظهور ${formatLastSeen(lastSeen)}` : 'غير متصل'))}
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
  );

  const SwipeableMessage = ({ message, children }: { message: IMessage; children: React.ReactNode }) => {
    const translateX = useSharedValue(0);
    const replyIconOpacity = useSharedValue(0);
    const scale = useSharedValue(1);
    
    const isMyMessage = message.user._id === user?.id;
    const maxSwipeDistance = 80;
    
    const gestureHandler = useAnimatedGestureHandler({
      onStart: () => {
        scale.value = withSpring(0.98);
      },
      onActive: (event) => {
        const swipeDirection = isMyMessage ? -event.translationX : event.translationX;
        if (swipeDirection > 0) {
          translateX.value = Math.min(swipeDirection, maxSwipeDistance);
          replyIconOpacity.value = Math.min(swipeDirection / maxSwipeDistance, 1);
        }
      },
      onEnd: (event) => {
        const swipeDirection = isMyMessage ? -event.translationX : event.translationX;
        scale.value = withSpring(1);
        
        if (swipeDirection > maxSwipeDistance * 0.6) {
          runOnJS(setReplyingToMessage)(message);
        }
        
        translateX.value = withSpring(0);
        replyIconOpacity.value = withSpring(0);
      },
    });
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: isMyMessage ? -translateX.value : translateX.value },
        { scale: scale.value },
      ],
    }));
    
    const replyIconStyle = useAnimatedStyle(() => ({
      opacity: replyIconOpacity.value,
      transform: [{ scale: replyIconOpacity.value }],
    }));
    
    return (
      <View style={{ position: 'relative' }}>
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              top: '50%',
              [isMyMessage ? 'right' : 'left']: 20,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#10b981',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
              transform: [{ translateY: -16 }],
            },
            replyIconStyle,
          ]}
        >
          <Ionicons name="arrow-undo" size={18} color="#ffffff" />
        </Reanimated.View>
        
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Reanimated.View style={animatedStyle}>
            {children}
          </Reanimated.View>
        </PanGestureHandler>
      </View>
    );
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user || !chatId) return;
    
    try {
      const messageRef = db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId);
      
      const messageDoc = await messageRef.get();
      const messageData = messageDoc.data();
      const reactions = messageData?.reactions || {};
    
      if (reactions[emoji]) {
        if (reactions[emoji].includes(user.id)) {
          reactions[emoji] = reactions[emoji].filter((id: string) => id !== user.id);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji].push(user.id);
        }
      } else {
        reactions[emoji] = [user.id];
      }
    
      await messageRef.update({ reactions });
      setShowReactions(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const deleteMessage = async (messageId: string, deleteForEveryone: boolean = false) => {
    if (!user || !chatId) return;
    
    try {
      const messageRef = db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId);
      
      if (deleteForEveryone) {
        await messageRef.update({
          text: 'تم حذف هذه الرسالة',
          isDeleted: true,
        });
      } else {
        await messageRef.delete();
      }
      
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!user || !chatId) return;
    
    try {
      const batch = db.batch();
      
      const messageRef = db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId);
      
      batch.update(messageRef, {
        text: newText,
        isEdited: true,
        editedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      
      const repliesSnapshot = await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .where('replyTo.messageId', '==', messageId)
        .get();
      
      repliesSnapshot.forEach((doc) => {
        const replyRef = db
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .doc(doc.id);
        
        batch.update(replyRef, {
          'replyTo.text': newText,
        });
      });
      
      await batch.commit();
      setEditingMessage(null);
      setInputText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const showMessageActions = (message: IMessage) => {
    const isMyMessage = message.user._id === user?.id;
    
    const options = [
      'رد',
      'نسخ النص',
      '😀', '❤️', '😂', '😮', '😢', '😡',
      ...(isMyMessage ? ['تعديل', 'حذف'] : []),
      'إلغاء'
    ];
    
    const cancelButtonIndex = options.length - 1;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'خيارات الرسالة',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            setReplyingToMessage(message);
          } else if (buttonIndex === 1) {
            // Copy text functionality
          } else if (buttonIndex >= 2 && buttonIndex <= 7) {
            const emojis = ['😀', '❤️', '😂', '😮', '😢', '😡'];
            addReaction(message._id as string, emojis[buttonIndex - 2]);
          } else if (isMyMessage && buttonIndex === options.length - 3) {
            setEditingMessage(message);
            setInputText(message.text);
          } else if (isMyMessage && buttonIndex === options.length - 2) {
            Alert.alert('حذف الرسالة', 'هل تريد حذف هذه الرسالة؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'حذف للجميع', onPress: () => deleteMessage(message._id as string, true) },
              { text: 'حذف لي فقط', onPress: () => deleteMessage(message._id as string, false) },
            ]);
          }
        }
      );
    }
  };

  const renderBubble = (props: any) => {
    const message = props.currentMessage;
    const isMyMessage = message.user._id === user?.id;
    const reactions = message.reactions || {};
    
    return (
      <SwipeableMessage message={message}>
        <View>
          {message.replyTo && (
            <View style={{
              backgroundColor: isMyMessage ? '#374151' : '#1f2937',
              padding: 8,
              marginHorizontal: 10,
              marginBottom: 4,
              borderRadius: 8,
              borderLeftWidth: 3,
              borderLeftColor: '#10b981',
            }}>
              <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: 'bold' }}>
                {message.replyTo.userName}
              </Text>
              <Text style={{ color: '#d1d5db', fontSize: 12 }} numberOfLines={1}>
                {message.replyTo.text}
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            onLongPress={() => showMessageActions(message)}
            style={{ position: 'relative' }}
          >
            <Bubble
              {...props}
              wrapperStyle={{
                left: { backgroundColor: '#374151' },
                right: { backgroundColor: '#10b981' },
              }}
              textStyle={{
                left: { color: '#ffffff' },
                right: { color: '#ffffff' },
              }}
            />
            
            <TouchableOpacity
              onPress={() => setReplyingToMessage(message)}
              style={{
                position: 'absolute',
                top: -8,
                [isMyMessage ? 'left' : 'right']: -8,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#6b7280',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="arrow-undo" size={12} color="#ffffff" />
            </TouchableOpacity>
          </TouchableOpacity>
          
          {Object.keys(reactions).length > 0 && (
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 4,
              marginHorizontal: 10,
            }}>
              {Object.entries(reactions).map(([emoji, users]) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => addReaction(message._id as string, emoji)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: (users as string[]).includes(user?.id || '') ? '#10b981' : '#374151',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 12,
                    marginRight: 4,
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{emoji}</Text>
                  <Text style={{ color: '#ffffff', fontSize: 10, marginLeft: 2 }}>
                    {(users as string[]).length}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </SwipeableMessage>
    );
  };

  const renderInputToolbar = () => {
    const canSend = inputText.trim() || editingMessage || isRecording;
    
    return (
      <View style={{ backgroundColor: '#111827' }}>
        {replyingToMessage && (
          <View style={{
            backgroundColor: '#1f2937',
            padding: 12,
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 8,
            borderLeftWidth: 3,
            borderLeftColor: '#10b981',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons name="arrow-undo" size={16} color="#10b981" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>
                الرد على {replyingToMessage.user.name}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 12 }} numberOfLines={1}>
                {replyingToMessage.text}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingToMessage(null)}>
              <Ionicons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}
        
        {editingMessage && (
          <View style={{
            backgroundColor: '#1f2937',
            padding: 12,
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 8,
            borderLeftWidth: 3,
            borderLeftColor: '#f59e0b',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons name="create" size={16} color="#f59e0b" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: 'bold' }}>
                تعديل الرسالة
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              setEditingMessage(null);
              setInputText('');
            }}>
              <Ionicons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#111827',
        }}>
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1f2937',
            borderRadius: 20,
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
            
            {!canSend && (
              <TouchableOpacity style={{ marginLeft: 8 }}>
                <Ionicons name="camera" size={24} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            onPress={() => {
              if (inputText.trim()) {
                if (editingMessage) {
                  editMessage(editingMessage._id as string, inputText.trim());
                } else {
                  onSend([{
                    _id: Math.random().toString(),
                    text: inputText.trim(),
                    createdAt: new Date(),
                    user: {
                      _id: user?.id || '',
                      name: user?.name || '',
                      ...(user?.photoUrl && { avatar: user.photoUrl }),
                    },
                    ...(replyingToMessage && {
                      replyTo: {
                        messageId: replyingToMessage._id,
                        text: replyingToMessage.text,
                        userName: replyingToMessage.user.name,
                      },
                    }),
                  }]);
                  setInputText('');
                  setReplyingToMessage(null);
                }
              }
            }}
            disabled={!canSend}
            style={{
              marginLeft: 8,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: canSend ? '#10b981' : '#374151',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons 
              name={isRecording ? 'stop' : 'send'} 
              size={20} 
              color={canSend ? '#ffffff' : '#9ca3af'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const onSend = useCallback(async (messages: IMessage[] = []) => {
    if (!user || !chatId) return;

    const message = messages[0];
    
    try {
      await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add({
          _id: message._id,
          text: message.text,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          user: {
            _id: user.id,
            name: user.name,
            ...(user.photoUrl && { avatar: user.photoUrl }),
          },
          ...((message as any).replyTo && { replyTo: (message as any).replyTo }),
        });

      await db.collection('chats').doc(chatId).set({
        participants: [user.id, otherUser.id],
        lastMessage: message.text,
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageSender: user.id,
      }, { merge: true });

      if (isTyping) {
        setIsTyping(false);
        db.collection('chats').doc(chatId).collection('typing').doc(user.id).delete();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('خطأ', 'فشل في إرسال الرسالة');
    }
  }, [user, chatId, otherUser.id, isTyping]);

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
              _id: user?.id || '',
              name: user?.name || '',
              ...(user?.photoUrl && { avatar: user.photoUrl }),
            }}
            renderBubble={renderBubble}
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
