import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSimpleAuth } from '../services/simpleAuth';
import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';

const { width: screenWidth } = Dimensions.get('window');

interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  read?: boolean;
  replyTo?: {
    id: string;
    text: string;
  };
  reactions?: {
    [userId: string]: string;
  };
  deletedFor?: string[];
}

interface InstagramChatScreenProps {
  route: any;
  navigation: any;
}

export const InstagramChatScreen = ({ route, navigation }: InstagramChatScreenProps) => {
  const { user } = useSimpleAuth();
  const { chatId, otherUser } = route.params || {};
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const [doubleTapTimeout, setDoubleTapTimeout] = useState<NodeJS.Timeout | null>(null);

  const reactions = ['❤️', '😂', '😮', '😢', '😡', '👍'];

  // Generate avatar colors based on name hash
  const getAvatarColors = (name: string) => {
    const colors = [
      ['#667eea', '#764ba2'], // Purple-Blue
      ['#f093fb', '#f5576c'], // Pink-Red
      ['#4facfe', '#00f2fe'], // Blue-Cyan
      ['#43e97b', '#38f9d7'], // Green-Teal
      ['#fa709a', '#fee140'], // Pink-Yellow
      ['#a8edea', '#fed6e3'], // Mint-Pink
      ['#ff9a9e', '#fecfef'], // Coral-Pink
      ['#667eea', '#764ba2'], // Purple-Blue
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
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

  // Format message time
  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'الآن';
    } else if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} د`;
    } else if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
    }
  };

  // Load messages and typing status
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
          const data = doc.data() as Omit<Message, 'id'>;
          if (!data.deletedFor || !data.deletedFor.includes(user.id)) {
            messageList.push({
              ...data,
              id: doc.id,
            });
          }
        });
        setMessages(messageList);
      });

    // Monitor other user's typing status
    const unsubscribeTyping = db
      .collection('chats')
      .doc(chatId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          const typingUsers = data?.typingUsers || {};
          const otherUserTypingTime = typingUsers[otherUser?.id];
          
          // Check if other user is typing (within last 3 seconds)
          if (otherUserTypingTime && typeof otherUserTypingTime === 'number') {
            const now = Date.now();
            const isRecentlyTyping = (now - otherUserTypingTime) < 3000;
            setOtherUserTyping(isRecentlyTyping);
            
            // Start or stop animation based on typing status
            if (isRecentlyTyping) {
              Animated.loop(
                Animated.sequence([
                  Animated.timing(typingAnimation, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                  }),
                  Animated.timing(typingAnimation, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                  }),
                ])
              ).start();
            } else {
              typingAnimation.stopAnimation();
              typingAnimation.setValue(0);
            }
            
            // Auto-clear if too old
            if (!isRecentlyTyping) {
              db.collection('chats').doc(chatId).update({
                [`typingUsers.${otherUser.id}`]: null
              }).catch(console.error);
            }
          } else {
            setOtherUserTyping(false);
            typingAnimation.stopAnimation();
            typingAnimation.setValue(0);
          }
        }
      });

    return () => {
      unsubscribe();
      unsubscribeTyping();
    };
  }, [user, chatId, otherUser?.id, typingAnimation]);

  // Update typing status with proper cleanup
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const updateTypingStatus = async (typing: boolean) => {
    if (!user || !chatId) return;
    
    try {
      // Clear existing timeout first
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      // Update Firebase with typing status
      await db.collection('chats').doc(chatId).update({
        [`typingUsers.${user.id}`]: typing ? Date.now() : null
      });
      
      // Set new timeout to clear typing status after 2 seconds
      if (typing) {
        typingTimeoutRef.current = setTimeout(async () => {
          try {
            await db.collection('chats').doc(chatId).update({
              [`typingUsers.${user.id}`]: null
            });
            setIsTyping(false);
          } catch (error) {
            console.error('Error clearing typing status:', error);
          }
        }, 2000) as ReturnType<typeof setTimeout>;
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // Handle input text change with typing indicator
  const handleInputChange = (text: string) => {
    setInputText(text);
    
    if (text.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        updateTypingStatus(true);
      } else {
        // Reset the timeout if still typing
        updateTypingStatus(true);
      }
    } else {
      // Clear typing immediately when input is empty
      setIsTyping(false);
      updateTypingStatus(false);
    }
  };

  const sendMessage = async (messageData: Partial<Message>) => {
    if (!user || !chatId) return;

    const tempId = Date.now().toString();
    const newMessage: Message = {
      senderId: user.id,
      senderName: user.name,
      timestamp: Date.now(),
      status: 'sending',
      ...messageData,
      id: tempId,
    };

    setMessages(prev => [newMessage, ...prev]);

    try {
      const messageToSend = {
        senderId: newMessage.senderId,
        senderName: newMessage.senderName,
        text: newMessage.text,
        timestamp: newMessage.timestamp,
        status: 'sent',
        ...(newMessage.replyTo && { replyTo: newMessage.replyTo }),
        ...(newMessage.reactions && { reactions: newMessage.reactions }),
      };

      const docRef = await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(messageToSend);

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: docRef.id, status: 'sent' }
            : msg
        )
      );

      // Create or update chat document
      const chatRef = db.collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();
      
      if (!chatDoc.exists) {
        await chatRef.set({
          participants: [user.id, otherUser?.id],
          createdAt: Date.now(),
          lastMessage: messageData.text || (messageData.imageUrl ? 'صورة' : 'رسالة صوتية'),
          lastMessageTime: Date.now(),
          [`unreadCount.${otherUser?.id}`]: 1,
        });
      } else {
        await chatRef.update({
          lastMessage: messageData.text || (messageData.imageUrl ? 'صورة' : 'رسالة صوتية'),
          lastMessageTime: Date.now(),
          [`unreadCount.${otherUser?.id}`]: firebase.firestore.FieldValue.increment(1),
        });
      }

      updateTypingStatus(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  };

  const handleSendText = () => {
    if (inputText.trim()) {
      // Clear typing status immediately when sending
      setIsTyping(false);
      updateTypingStatus(false);
      
      sendMessage({ 
        text: inputText.trim(),
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.imageUrl ? 'صورة' : 'رسالة صوتية')
        } : undefined
      });
      setInputText('');
      setReplyingTo(null);
    }
  };

  // Handle double tap for heart reaction
  const handleDoubleTap = (message: Message) => {
    addReaction(message.id, '❤️');
  };

  // Handle single/double tap detection
  const handleMessageTap = (message: Message) => {
    if (doubleTapTimeout) {
      clearTimeout(doubleTapTimeout);
      setDoubleTapTimeout(null);
      // Double tap - add heart reaction
      addReaction(message.id, '❤️');
    } else {
      const timeout = setTimeout(() => {
        setDoubleTapTimeout(null);
        // Single tap - do nothing
      }, 300) as unknown as NodeJS.Timeout;
      setDoubleTapTimeout(timeout);
    }
  };

  const handleMessageLongPress = (message: Message) => {
    setSelectedMessage(message);
    setShowReactionsModal(true);
  };

  const addReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    
    try {
      const messageRef = db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId);
      
      await messageRef.update({
        [`reactions.${user.id}`]: reaction
      });
      
      setShowReactionsModal(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const deleteMessageForMe = async (messageId: string) => {
    if (!user) return;
    try {
      await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId)
        .update({
          deletedFor: firebase.firestore.FieldValue.arrayUnion(user.id)
        });
    } catch (error) {
      console.error('Error deleting message for me:', error);
    }
  };

  const deleteMessageForEveryone = async (messageId: string) => {
    try {
      await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId)
        .update({
          text: 'تم حذف هذه الرسالة',
          deletedForEveryone: true,
          deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Error deleting message for everyone:', error);
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!user || !newText.trim()) return;
    
    try {
      const messageRef = db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId);
      
      await messageRef.update({
        text: newText.trim(),
        editedAt: Date.now(),
        isEdited: true
      });
      
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const createGestureHandler = (messageId: string) => {
    const messageTranslateX = new Animated.Value(0);
    
    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: messageTranslateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: any, message: Message) => {
      if (event.nativeEvent.state === State.END) {
        const translationX = event.nativeEvent.translationX;
        if (Math.abs(translationX) > 50) {
          setReplyingTo(message);
        }
        Animated.spring(messageTranslateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    };

    return { onGestureEvent, onHandlerStateChange, messageTranslateX };
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.senderId === user?.id;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const { onGestureEvent, onHandlerStateChange, messageTranslateX } = createGestureHandler(item.id);
    
    if (item.deletedFor?.includes('everyone')) {
      return (
        <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
          <View style={[styles.deletedMessage, isMyMessage ? styles.myDeletedMessage : styles.otherDeletedMessage]}>
            <Ionicons name="trash-outline" size={16} color="#64748b" />
            <Text style={styles.deletedText}>تم حذف هذه الرسالة</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}>
        {/* Reactions above message */}
        {item.reactions && Object.keys(item.reactions).length > 0 && (
          <View style={[styles.reactionsAboveMessage, isMyMessage ? styles.reactionsAboveMyMessage : styles.reactionsAboveOtherMessage]}>
            <View style={styles.reactionsRow}>
              {Object.entries(item.reactions).map(([userId, reaction]) => (
                <TouchableOpacity key={userId} style={styles.reactionBubble}>
                  <Text style={styles.reactionEmoji}>{reaction}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}>
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={(event) => onHandlerStateChange(event, item)}
          >
            <Animated.View style={{
              transform: [{ translateX: messageTranslateX }],
              flexDirection: 'row',
              alignItems: 'flex-end',
            }}>
              {showAvatar && !isMyMessage && (
                <View style={styles.avatarContainer}>
                  {otherUser?.photoUrl && otherUser.photoUrl.trim() !== '' ? (
                    <Image
                      source={{ uri: otherUser.photoUrl }}
                      style={styles.messageAvatar}
                    />
                  ) : (
                    <LinearGradient
                      colors={getAvatarColors(otherUser?.name || 'مستخدم')}
                      style={styles.messageAvatar}
                    >
                      <Text style={styles.avatarText}>
                        {getAvatarInitials(otherUser?.name || 'مستخدم')}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
              )}
              
              <TouchableOpacity
                onLongPress={() => handleMessageLongPress(item)}
                onPress={() => handleMessageTap(item)}
                style={[
                  styles.messageBubble,
                  isMyMessage ? styles.myMessage : styles.otherMessage,
                  !showAvatar && !isMyMessage && styles.messageWithoutAvatar,
                ]}
              >
              {item.replyTo && (
                <View style={styles.replyContainer}>
                  <View style={styles.replyLine} />
                  <View style={styles.replyContent}>
                    <Text style={styles.replyText} numberOfLines={2}>{item.replyTo.text}</Text>
                  </View>
                </View>
              )}

              {item.text && (
                <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                  {item.text}
                </Text>
              )}

              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
              )}

              <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
                {formatMessageTime(item.timestamp)}
              </Text>

              {isMyMessage && (
                <View style={styles.messageStatus}>
                    {item.status === 'sending' && (
                      <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    )}
                    {item.status === 'sent' && (
                      <Ionicons name="checkmark" size={14} color="#94a3b8" />
                    )}
                    {item.status === 'delivered' && (
                      <Ionicons name="checkmark-done" size={14} color="#94a3b8" />
                    )}
                    {item.status === 'read' && (
                      <Ionicons name="checkmark-done" size={14} color="#0ea5e9" />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </View>
    );
  };

  const renderReactionsModal = () => (
    <Modal
      visible={showReactionsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowReactionsModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        onPress={() => setShowReactionsModal(false)}
      >
        <View style={styles.instagramModal}>
          {/* Quick reactions */}
          <View style={styles.quickReactionsContainer}>
            {reactions.map((reaction) => (
              <TouchableOpacity
                key={reaction}
                style={styles.quickReactionButton}
                onPress={() => {
                  if (selectedMessage) {
                    addReaction(selectedMessage.id, reaction);
                  }
                }}
              >
                <Text style={styles.quickReactionEmoji}>{reaction}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Action buttons */}
          <View style={styles.instagramActions}>
            <TouchableOpacity
              style={styles.instagramActionButton}
              onPress={() => {
                if (selectedMessage) {
                  setReplyingTo(selectedMessage);
                }
                setShowReactionsModal(false);
              }}
            >
              <Ionicons name="arrow-undo" size={24} color="#ffffff" />
              <Text style={styles.instagramActionText}>Reply</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.instagramActionButton}
              onPress={() => {
                // Copy message functionality
                setShowReactionsModal(false);
              }}
            >
              <Ionicons name="copy" size={24} color="#ffffff" />
              <Text style={styles.instagramActionText}>Copy</Text>
            </TouchableOpacity>
            
            
            <TouchableOpacity
              style={styles.instagramActionButton}
              onPress={() => {
                if (selectedMessage) {
                  deleteMessageForMe(selectedMessage.id);
                }
                setShowReactionsModal(false);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.instagramActionText, { color: '#ef4444' }]}>حذف لدي</Text>
            </TouchableOpacity>
            
            {selectedMessage?.senderId === user?.id && (
              <>
                <TouchableOpacity
                  style={styles.instagramActionButton}
                  onPress={() => {
                    if (selectedMessage) {
                      setEditingMessage(selectedMessage);
                      setEditText(selectedMessage.text || '');
                    }
                    setShowReactionsModal(false);
                  }}
                >
                  <Ionicons name="create" size={24} color="#ffffff" />
                  <Text style={styles.instagramActionText}>تعديل</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.instagramActionButton}
                  onPress={() => {
                    if (selectedMessage) {
                      deleteMessageForEveryone(selectedMessage.id);
                    }
                    setShowReactionsModal(false);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#dc2626" />
                  <Text style={[styles.instagramActionText, { color: '#dc2626' }]}>حذف لدى الجميع</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <LinearGradient colors={['#1a1a1a', '#000000']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            <View style={styles.headerAvatarContainer}>
              {otherUser?.photoUrl && otherUser.photoUrl.trim() !== '' ? (
                <Image
                  source={{ uri: otherUser.photoUrl }}
                  style={styles.headerAvatar}
                />
              ) : (
                <LinearGradient
                  colors={getAvatarColors(otherUser?.name || 'مستخدم')}
                  style={styles.headerAvatar}
                >
                  <Text style={styles.headerAvatarText}>
                    {getAvatarInitials(otherUser?.name || 'مستخدم')}
                  </Text>
                </LinearGradient>
              )}
            </View>
            
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{otherUser.name}</Text>
              <Text style={styles.userStatus}>
                {otherUserTyping ? 'يكتب...' : 'آخر ظهور منذ دقيقتين'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            inverted
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
          />

          {otherUserTyping && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDots}>
                <Animated.View style={[
                  styles.typingDot,
                  {
                    transform: [{
                      scale: typingAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.3, 1],
                      }),
                    }],
                  },
                ]} />
                <Animated.View style={[
                  styles.typingDot,
                  {
                    transform: [{
                      scale: typingAnimation.interpolate({
                        inputRange: [0, 0.3, 0.8, 1],
                        outputRange: [1, 1, 1.3, 1],
                      }),
                    }],
                  },
                ]} />
                <Animated.View style={[
                  styles.typingDot,
                  {
                    transform: [{
                      scale: typingAnimation.interpolate({
                        inputRange: [0, 0.6, 1],
                        outputRange: [1, 1, 1.3],
                      }),
                    }],
                  },
                ]} />
              </View>
              <Text style={styles.typingText}>{otherUser?.name} يكتب...</Text>
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          {replyingTo && (
            <View style={styles.replyPreview}>
              <View style={styles.replyIndicator} />
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewText} numberOfLines={2}>{replyingTo.text}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeButton}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {editingMessage && (
            <View style={styles.editingPreview}>
              <View style={styles.editingPreviewContent}>
                <Text style={styles.editingPreviewLabel}>تعديل الرسالة</Text>
                <Text style={styles.editingPreviewText}>{editingMessage.text}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setEditingMessage(null);
                setEditText('');
              }}>
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}


          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera" size={22} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.textInputContainer}>
              <TextInput
                style={[styles.textInput, { maxHeight: 100 }]}
                value={editingMessage ? editText : inputText}
                onChangeText={(text) => {
                  if (editingMessage) {
                    setEditText(text);
                  } else {
                    handleInputChange(text);
                  }
                }}
                placeholder={editingMessage ? "تعديل الرسالة..." : "اكتب رسالة..."}
                placeholderTextColor="#64748b"
                multiline
              />
            </View>

            {(inputText.trim() || editText.trim()) ? (
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={() => {
                  if (editingMessage) {
                    editMessage(editingMessage.id, editText);
                  } else {
                    handleSendText();
                  }
                }}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#06b6d4']}
                  style={styles.sendButtonGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <Ionicons name={editingMessage ? "checkmark" : "send"} size={18} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.voiceButton}>
                <LinearGradient
                  colors={['#f97316', '#ea580c']}
                  style={styles.voiceButtonGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <Ionicons name="mic" size={18} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {renderReactionsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    marginRight: 12,
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
  replyingToContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyingToContent: {
    flex: 1,
  },
  replyingToName: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyingToText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  cancelReplyButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 0,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 2,
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 0,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 1,
  },
  myMessage: {
    backgroundColor: '#0ea5e9',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    marginLeft: 50,
  },
  otherMessage: {
    backgroundColor: '#374151',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    marginRight: 100,
    marginLeft: 12,
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  deletedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    opacity: 0.6,
  },
  myDeletedMessage: {
    backgroundColor: 'rgba(14, 165, 233, 0.3)',
  },
  otherDeletedMessage: {
    backgroundColor: 'rgba(38, 38, 38, 0.3)',
  },
  deletedText: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  replyContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    paddingLeft: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 10,
    marginHorizontal: 0,
  },
  replyLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#0ea5e9',
    borderRadius: 1.5,
  },
  replyContent: {
    paddingLeft: 6,
  },
  replyText: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.9,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#ffffff',
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#ffffff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  messageStatus: {
    marginLeft: 4,
  },
  reactionsAboveMessage: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  reactionsAboveMyMessage: {
    alignSelf: 'flex-end',
  },
  reactionsAboveOtherMessage: {
    alignSelf: 'flex-start',
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionBubble: {
    marginHorizontal: 2,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  addReactionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  addReactionButtonStandalone: {
    position: 'absolute',
    top: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addReactionButtonMyMessage: {
    right: 20,
  },
  addReactionButtonOtherMessage: {
    left: 20,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  reaction: {
    fontSize: 16,
    marginRight: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  inputContainer: {
    backgroundColor: '#1a1a1a',
    paddingBottom: 12,
    paddingTop: 4,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramModal: {
    backgroundColor: '#262626',
    borderRadius: 12,
    minWidth: 250,
    maxWidth: 300,
  },
  quickReactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickReactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickReactionEmoji: {
    fontSize: 24,
  },
  instagramActions: {
    paddingVertical: 8,
  },
  instagramActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  instagramActionText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
  },
  reactionsModal: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 280,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  messageActions: {
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 40,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginHorizontal: 1,
  },
  typingText: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 8,
  },
  replyPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyIndicator: {
    width: 4,
    height: 40,
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
    marginRight: 12,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyPreviewText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  avatarContainer: {
    marginRight: 2,
    marginBottom: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerAvatarContainer: {
    marginRight: 12,
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  otherMessageTime: {
    color: '#94a3b8',
  },
  closeButton: {
    padding: 8,
  },
  editingPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  editingPreviewContent: {
    flex: 1,
  },
  editingPreviewLabel: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  editingPreviewText: {
    color: '#ffffff',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
  },
  cameraButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  textInput: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
    minHeight: 24,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginLeft: 8,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginLeft: 8,
  },
  voiceButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
});

export default InstagramChatScreen;
