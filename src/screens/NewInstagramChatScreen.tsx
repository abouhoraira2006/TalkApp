import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  Animated,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { db } from '../config/firebase';
import { useSimpleAuth } from '../services/simpleAuth';
import ChatHeader from '../components/ChatHeader';

type RootStackParamList = {
  InstagramChat: {
    chatId: string;
    otherUser: {
      id: string;
      name: string;
      photoUrl?: string;
    };
  };
};

type InstagramChatScreenRouteProp = RouteProp<RootStackParamList, 'InstagramChat'>;
type InstagramChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'InstagramChat'>;

interface InstagramChatScreenProps {
  route: InstagramChatScreenRouteProp;
  navigation: InstagramChatScreenNavigationProp;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  seen?: boolean;
  type?: string;
  image?: string;
  audio?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  reactions?: { [userId: string]: string };
}

const NewInstagramChatScreen: React.FC<InstagramChatScreenProps> = ({ route, navigation }) => {
  const { chatId, otherUser } = route.params;
  const { user } = useSimpleAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [quickReactionMessage, setQuickReactionMessage] = useState<Message | null>(null);
  const [reactionModalPosition, setReactionModalPosition] = useState({ x: 0, y: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Animation values
  const dot1Anim = useRef(new Animated.Value(0.4)).current;
  const dot2Anim = useRef(new Animated.Value(0.7)).current;
  const dot3Anim = useRef(new Animated.Value(1)).current;
  const replyAnimValue = useSharedValue(0);
  const replyTranslateY = useSharedValue(50);
  const replyOpacity = useSharedValue(0);
  const sendButtonScale = useSharedValue(0);
  const inputContainerTranslateY = useSharedValue(0);
  
  // Instagram reactions (exact order and emojis)
  const instagramReactions = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎'];
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        inputContainerTranslateY.value = withSpring(-e.endCoordinates.height + 34);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        inputContainerTranslateY.value = withSpring(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messageList: Message[] = [];
        snapshot.forEach((doc) => {
          messageList.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(messageList);
      });

    // Listen for typing indicators
    const typingUnsubscribe = db.collection('chats')
      .doc(chatId)
      .onSnapshot((doc) => {
        const chatData = doc.data();
        if (chatData && chatData.typing) {
          const typingUsersList = Object.keys(chatData.typing).filter(
            userId => chatData.typing[userId] && userId !== user?.id
          );
          setTypingUsers(typingUsersList);
        } else {
          setTypingUsers([]);
        }
      });

    return () => {
      unsubscribe();
      typingUnsubscribe();
    };
  }, [chatId, user?.id]);

  // Animate typing dots
  useEffect(() => {
    if (typingUsers.length > 0) {
      const animateTyping = () => {
        Animated.sequence([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(dot1Anim, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0.7,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
        ]).start(() => {
          if (typingUsers.length > 0) {
            animateTyping();
          }
        });
      };
      animateTyping();
    }
  }, [typingUsers.length, dot1Anim, dot2Anim, dot3Anim]);

  const sendMessage = async (text: string) => {
    if (!user || !text.trim()) return;

    try {
      // Animate send button
      sendButtonScale.value = withSpring(1.2, { duration: 100 }, () => {
        sendButtonScale.value = withSpring(1);
      });
      
      // Stop typing indicator
      await updateTypingStatus(false);

      const messageData: any = {
        text: text.trim(),
        senderId: user.id,
        timestamp: Date.now(),
        seen: false,
      };

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderId === user.id ? 'You' : otherUser.name,
        };
        cancelReply();
      }

      await db.collection('chats').doc(chatId).collection('messages').add(messageData);

      // Update chat last message and mark as seen for sender
      await db.collection('chats').doc(chatId).update({
        lastMessage: text.trim(),
        lastMessageTime: Date.now(),
        [`seen.${user.id}`]: Date.now(),
      });

      // Scroll to bottom with animation
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const updateTypingStatus = async (typing: boolean) => {
    if (!user || !chatId) return;

    try {
      await db.collection('chats').doc(chatId).update({
        [`typing.${user.id}`]: typing,
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleTyping = (text: string) => {
    if (!user) return;

    const isCurrentlyTyping = text.length > 0;
    
    if (isCurrentlyTyping !== isTyping) {
      setIsTyping(isCurrentlyTyping);
      updateTypingStatus(isCurrentlyTyping);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updateTypingStatus(false);
      }, 2000);
    }
  };
  
  const handleLongPress = (message: Message, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setQuickReactionMessage(message);
    setReactionModalPosition({ x: pageX, y: pageY - 60 });
    setShowQuickReactions(true);
  };

  // Mark messages as seen when screen is focused
  useEffect(() => {
    if (!user || !chatId) return;

    const markAsSeen = async () => {
      try {
        await db.collection('chats').doc(chatId).update({
          [`seen.${user.id}`]: Date.now(),
        });
      } catch (error) {
        console.error('Error marking as seen:', error);
      }
    };

    markAsSeen();
  }, [chatId, user?.id]);

  const handleReply = (message: Message) => {
    setReplyTo(message);
    replyAnimValue.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
    replyTranslateY.value = withSpring(0);
    replyOpacity.value = withSpring(1);
    inputRef.current?.focus();
  };
  
  const cancelReply = () => {
    replyAnimValue.value = withSpring(0);
    replyTranslateY.value = withSpring(50);
    replyOpacity.value = withSpring(0);
    setTimeout(() => setReplyTo(null), 200);
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    if (!user) return;

    try {
      const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
      const messageDoc = await messageRef.get();
      const messageData = messageDoc.data();

      if (messageData) {
        const currentReactions = messageData.reactions || {};
        
        if (currentReactions[user.id] === reaction) {
          // Remove reaction
          delete currentReactions[user.id];
        } else {
          // Add or update reaction
          currentReactions[user.id] = reaction;
        }

        await messageRef.update({ reactions: currentReactions });
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      await db.collection('chats').doc(chatId).collection('messages').doc(messageId).update({
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: user.id,
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('خطأ', 'فشل في حذف الرسالة');
    }
  };

  const SwipeableMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.id;
    const translateX = useSharedValue(0);
    const replyIconOpacity = useSharedValue(0);
    
    const gestureHandler = useAnimatedGestureHandler({
      onStart: () => {
        // Start gesture
      },
      onActive: (event) => {
        const maxSwipe = isCurrentUser ? -80 : 80;
        const direction = isCurrentUser ? -1 : 1;
        
        if ((isCurrentUser && event.translationX < 0) || (!isCurrentUser && event.translationX > 0)) {
          translateX.value = Math.max(Math.min(event.translationX, Math.abs(maxSwipe)), maxSwipe);
          replyIconOpacity.value = Math.min(Math.abs(translateX.value) / 60, 1);
        }
      },
      onEnd: (event) => {
        const threshold = 60;
        if (Math.abs(translateX.value) > threshold) {
          runOnJS(handleReply)(item);
        }
        translateX.value = withSpring(0);
        replyIconOpacity.value = withSpring(0);
      },
    });
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
      };
    });
    
    const replyIconStyle = useAnimatedStyle(() => {
      return {
        opacity: replyIconOpacity.value,
      };
    });
    
    return (
      <View style={styles.messageContainer}>
        {/* Reply icon */}
        <Reanimated.View style={[
          styles.replyIcon,
          isCurrentUser ? styles.replyIconRight : styles.replyIconLeft,
          replyIconStyle
        ]}>
          <Ionicons name="arrow-undo" size={20} color="rgba(255, 255, 255, 0.6)" />
        </Reanimated.View>
        
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Reanimated.View style={animatedStyle}>
            <View style={[
              styles.messageBubble,
              isCurrentUser ? styles.myMessageBubble : styles.otherMessageBubble
            ]}>
              {/* Reply preview */}
              {item.replyTo && (
                <View style={styles.replyPreviewContainer}>
                  <Text style={styles.replyLabel}>تم الرد على</Text>
                  <View style={[
                    styles.replyContainer,
                    { backgroundColor: isCurrentUser ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)' }
                  ]}>
                    <View style={[
                      styles.replyLine,
                      { backgroundColor: isCurrentUser ? 'rgba(255, 255, 255, 0.6)' : '#0084ff' }
                    ]} />
                    <Text style={styles.replyText} numberOfLines={1}>
                      {item.replyTo.text}
                    </Text>
                  </View>
                </View>
              )}

              {/* Message content */}
              <TouchableOpacity
                onLongPress={(event) => handleLongPress(item, event)}
                onPress={() => {
                  // Double tap for quick heart reaction
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.messageText,
                  isCurrentUser ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.text}
                </Text>
              </TouchableOpacity>

              {/* Reactions */}
              {item.reactions && Object.keys(item.reactions).length > 0 && (
                <View style={styles.reactionsContainer}>
                  {Object.entries(item.reactions).map(([userId, reaction]) => (
                    <View key={userId} style={styles.reactionBubble}>
                      <Text style={styles.reactionEmoji}>{reaction}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Message info */}
              <View style={styles.messageInfo}>
                <Text style={[
                  styles.messageTime,
                  isCurrentUser ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                  {new Date(item.timestamp).toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                {isCurrentUser && (
                  <Ionicons 
                    name="checkmark-done" 
                    size={14} 
                    color={item.seen ? "#0084ff" : "rgba(255, 255, 255, 0.6)"} 
                    style={styles.seenIcon} 
                  />
                )}
              </View>
            </View>
          </Reanimated.View>
        </PanGestureHandler>
      </View>
    );
  };
  
  const renderMessage = ({ item }: { item: Message }) => {
    return <SwipeableMessage item={item} />;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ChatHeader
        otherUserName={otherUser.name}
        isOnline={true}
        onBack={() => navigation.goBack()}
        onVideoCall={() => Alert.alert('قريباً', 'مكالمة الفيديو ستكون متاحة قريباً')}
        onVoiceCall={() => Alert.alert('قريباً', 'المكالمة الصوتية ستكون متاحة قريباً')}
        onInfo={() => Alert.alert('معلومات', `محادثة مع ${otherUser.name}`)}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <View style={styles.typingDots}>
              <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
            </View>
          </View>
        </View>
      )}

      {/* Enhanced Reply preview with animation */}
      {replyTo && (
        <Reanimated.View style={[
          styles.replyPreview,
          {
            transform: [{
              translateY: replyTranslateY
            }],
            opacity: replyOpacity
          }
        ]}>
          <View style={styles.replyPreviewContent}>
            <View style={styles.replyPreviewLine} />
            <View style={styles.replyPreviewText}>
              <Text style={styles.replyPreviewSender}>
                Replying to {replyTo.senderId === user?.id ? 'yourself' : otherUser.name}
              </Text>
              <Text style={styles.replyPreviewMessage} numberOfLines={1}>
                {replyTo.text}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={cancelReply}
            style={styles.replyPreviewClose}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </Reanimated.View>
      )}

      {/* Instagram-style Input with keyboard animation */}
      <View style={styles.instagramInputContainer}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={styles.instagramTextInput}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              handleTyping(text);
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Message..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            multiline
            maxLength={1000}
          />
          
          {/* Hide these buttons when input is focused */}
          {!isInputFocused && (
            <>
              <TouchableOpacity style={styles.emojiButton}>
                <Ionicons name="happy-outline" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.micButton}>
                <Ionicons name="mic" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageButton}>
                <Ionicons name="image" size={24} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
        
        {/* Hide buttons when typing, show only send button */}
        {isInputFocused && inputText.trim() ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => {
              sendMessage(inputText);
              setInputText('');
            }}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        ) : !isInputFocused ? (
          <TouchableOpacity style={styles.likeButton}>
            <Ionicons name="heart" size={24} color="#ff3040" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Instagram-style Reactions Modal */}
      <Modal
        visible={showQuickReactions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickReactions(false)}
      >
        <Pressable
          style={styles.reactionModalOverlay}
          onPress={() => setShowQuickReactions(false)}
        >
          <View
            style={[
              styles.instagramReactionContainer,
              {
                position: 'absolute',
                left: Math.max(10, Math.min(reactionModalPosition.x - 140, screenWidth - 290)),
                top: Math.max(100, reactionModalPosition.y - 70),
              }
            ]}
          >
            {instagramReactions.map((reaction, index) => (
              <TouchableOpacity
                key={reaction}
                style={styles.instagramReactionButton}
                onPress={() => {
                  if (quickReactionMessage) {
                    handleReaction(quickReactionMessage.id, reaction);
                  }
                  setShowQuickReactions(false);
                  setQuickReactionMessage(null);
                }}
              >
                <Text style={styles.instagramReactionEmoji}>{reaction}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  messagesList: {
    flex: 1,
    paddingVertical: 8,
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 1,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0084ff',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#262626',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '400',
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#fff',
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  seenIcon: {
    marginLeft: 2,
  },
  replyPreviewContainer: {
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 2,
    fontWeight: '500',
  },
  replyContainer: {
    borderRadius: 6,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyLine: {
    width: 2,
    height: 20,
    borderRadius: 1,
    marginRight: 6,
  },
  replyText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#262626',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '75%',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 2,
  },
  // Reply icon styles
  replyIcon: {
    position: 'absolute',
    top: '50%',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  replyIconLeft: {
    left: 10,
  },
  replyIconRight: {
    right: 10,
  },
  // Reactions styles
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 2,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  reactionBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 3,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reactionEmoji: {
    fontSize: 12,
  },
  // Reply preview styles
  replyPreview: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyPreviewLine: {
    width: 3,
    height: 40,
    backgroundColor: '#0084ff',
    borderRadius: 2,
    marginRight: 12,
  },
  replyPreviewText: {
    flex: 1,
  },
  replyPreviewSender: {
    fontSize: 11,
    color: '#0084ff',
    fontWeight: '600',
    marginBottom: 3,
  },
  replyPreviewMessage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  replyPreviewClose: {
    padding: 8,
  },
  // Instagram-style input
  instagramInputContainer: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    minHeight: 36,
  },
  cameraButton: {
    padding: 6,
    marginRight: 6,
  },
  instagramTextInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    maxHeight: 80,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emojiButton: {
    padding: 6,
    marginLeft: 4,
  },
  micButton: {
    padding: 6,
    marginLeft: 4,
  },
  imageButton: {
    padding: 6,
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: '#0084ff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  likeButton: {
    padding: 8,
  },
  // Instagram-style reaction modal
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  instagramReactionContainer: {
    backgroundColor: '#262626',
    borderRadius: 30,
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instagramReactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: 'transparent',
  },
  instagramReactionEmoji: {
    fontSize: 20,
  },
});

export default NewInstagramChatScreen;
