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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import CameraModal from '../components/CameraModal';
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
  delivered?: boolean;
  reactions?: { [userId: string]: string };
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  deleted?: boolean;
  deletedForEveryone?: boolean;
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showCamera, setShowCamera] = useState(false);
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
  const deleteIconOpacity = useSharedValue(0);

  // Instagram reactions (exact order and emojis)
  const instagramReactions = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎'];

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        inputContainerTranslateY.value = withSpring(-e.endCoordinates.height + 50);
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
        delivered: true,
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
      }, 200);
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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [messages.length]);

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

      const currentReactions = messageData?.reactions || {};

      if (currentReactions[user.id] === reaction) {
        // Remove reaction if same reaction is clicked
        delete currentReactions[user.id];
      } else {
        // Add or update reaction
        currentReactions[user.id] = reaction;
      }

      await messageRef.update({
        reactions: currentReactions,
      });
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleDeleteMessage = (message: Message) => {
    setMessageToDelete(message);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMessage = async (deleteForEveryone: boolean = false) => {
    if (!messageToDelete || !user) return;

    try {
      const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageToDelete.id);

      if (deleteForEveryone) {
        await messageRef.update({
          deleted: true,
          deletedForEveryone: true,
          text: 'This message was deleted',
        });
      } else {
        await messageRef.update({
          deleted: true,
          text: 'You deleted this message',
        });
      }

      setShowDeleteConfirm(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to share images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      sendMediaMessage(result.assets[0].uri, result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const sendMediaMessage = async (mediaUri: string, mediaType: 'image' | 'video' | 'audio') => {
    if (!user) return;

    try {
      const messageData: any = {
        text: '',
        senderId: user.id,
        timestamp: Date.now(),
        seen: false,
        delivered: true,
        mediaUrl: mediaUri,
        mediaType: mediaType,
      };

      await db.collection('chats').doc(chatId).collection('messages').add(messageData);

      // Update chat last message
      const lastMessageText = {
        image: '📷 Photo',
        video: '🎥 Video',
        audio: '🎤 Voice message'
      };
      
      await db.collection('chats').doc(chatId).update({
        lastMessage: lastMessageText[mediaType],
        lastMessageTime: Date.now(),
        [`seen.${user.id}`]: Date.now(),
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error) {
      console.error('Error sending media:', error);
      Alert.alert('Error', 'Failed to send media');
    }
  };

  const takePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }
    setShowCamera(true);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permissions to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        sendMediaMessage(uri, 'audio');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const SwipeableMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.id;
    const translateX = useSharedValue(0);
    const replyIconOpacity = useSharedValue(0);
    const deleteIconOpacity = useSharedValue(0);

    const gestureHandler = useAnimatedGestureHandler({
      onStart: () => {},
      onActive: (event) => {
        if (isCurrentUser) {
          // Swipe left to reply, swipe right to delete
          if (event.translationX < 0) {
            // Reply gesture (swipe left)
            translateX.value = Math.max(event.translationX, -80);
            replyIconOpacity.value = Math.min(Math.abs(translateX.value) / 60, 1);
            deleteIconOpacity.value = 0;
          } else if (event.translationX > 0) {
            // Delete gesture (swipe right)
            translateX.value = Math.min(event.translationX, 80);
            deleteIconOpacity.value = Math.min(translateX.value / 60, 1);
            replyIconOpacity.value = 0;
          }
        } else {
          // For other user messages, only allow reply (swipe right)
          if (event.translationX > 0) {
            translateX.value = Math.min(event.translationX, 80);
            replyIconOpacity.value = Math.min(translateX.value / 60, 1);
          }
        }
      },
      onEnd: () => {
        const threshold = 60;
        if (Math.abs(translateX.value) > threshold) {
          if (isCurrentUser && translateX.value > 0) {
            // Delete action
            runOnJS(handleDeleteMessage)(item);
          } else {
            // Reply action
            runOnJS(handleReply)(item);
          }
        }
        translateX.value = withSpring(0);
        replyIconOpacity.value = withSpring(0);
        deleteIconOpacity.value = withSpring(0);
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
    
    const deleteIconStyle = useAnimatedStyle(() => {
      return {
        opacity: deleteIconOpacity.value,
      };
    });
    
    return (
      <View style={styles.messageContainer}>
        <Reanimated.View style={[styles.replyIcon, isCurrentUser ? styles.replyIconRight : styles.replyIconLeft, replyIconStyle]}>
          <Ionicons name="arrow-undo" size={20} color="rgba(255, 255, 255, 0.6)" />
        </Reanimated.View>
        {isCurrentUser && (
          <Reanimated.View style={[styles.deleteIcon, styles.deleteIconLeft, deleteIconStyle]}>
            <Ionicons name="trash" size={20} color="#ff3040" />
          </Reanimated.View>
        )}
        
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Reanimated.View style={[animatedStyle, {
            ...styles.messageBubble,
            ...(isCurrentUser ? styles.myMessageBubble : styles.otherMessageBubble)
          }]}>
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
                activeOpacity={0.8}
              >
                {item.mediaUrl ? (
                <View>
                  {item.mediaType === 'image' && (
                    <Image source={{ uri: item.mediaUrl }} style={styles.mediaMessage} />
                  )}
                  {item.mediaType === 'video' && (
                    <View style={styles.videoContainer}>
                      <Image source={{ uri: item.mediaUrl }} style={styles.mediaMessage} />
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={30} color="#fff" />
                      </View>
                    </View>
                  )}
                  {item.mediaType === 'audio' && (
                    <View style={styles.audioMessage}>
                      <Ionicons name="play" size={20} color={isCurrentUser ? "#fff" : "#0084ff"} />
                      <View style={styles.audioWaveform}>
                        <View style={styles.waveBar} />
                        <View style={styles.waveBar} />
                        <View style={styles.waveBar} />
                        <View style={styles.waveBar} />
                        <View style={styles.waveBar} />
                      </View>
                      <Text style={[styles.audioDuration, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>0:15</Text>
                    </View>
                  )}
                  {item.text ? <Text style={[styles.messageText, isCurrentUser ? styles.myMessageText : styles.otherMessageText]}>{item.text}</Text> : null}
                </View>
              ) : (
                <Text style={[
                  styles.messageText, 
                  isCurrentUser ? styles.myMessageText : styles.otherMessageText,
                  item.deleted && styles.deletedMessageText
                ]}>
                  {item.deleted ? (item.deletedForEveryone ? 'تم حذف هذه الرسالة' : 'قمت بحذف هذه الرسالة') : item.text}
                </Text>
              )}
            </TouchableOpacity>
          </Reanimated.View>
        </PanGestureHandler>

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
          <Text style={[styles.messageTime, isCurrentUser ? styles.myMessageTime : styles.otherMessageTime]}>
            {new Date(item.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isCurrentUser && (
            <View style={styles.statusIcons}>
              {item.delivered && !item.seen && (
                <Ionicons
                  name="checkmark"
                  size={12}
                  color="rgba(255, 255, 255, 0.6)"
                  style={styles.deliveredIcon}
                />
              )}
              <Ionicons
                name="checkmark-done"
                size={14}
                color={item.seen ? "#0084ff" : "rgba(255, 255, 255, 0.6)"}
                style={styles.seenIcon}
              />
              {item.seen && (
                <Text style={styles.seenText}>تمت المشاهدة</Text>
              )}
            </View>
          )}
        </View>
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
        otherUserPhoto={otherUser.photoUrl}
        isOnline={true}
        onBack={() => navigation.goBack()}
        onVideoCall={() => console.log('Video call')}
        onVoiceCall={() => console.log('Voice call')}
        onInfo={() => console.log('User info')}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
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
          <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
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
              <TouchableOpacity 
                style={styles.emojiButton}
                onPress={() => {
                  // Add emoji reaction to last message
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.senderId !== user?.id) {
                    handleReaction(lastMessage.id, '❤️');
                  }
                }}
              >
                <Ionicons name="happy-outline" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.micButton, isRecording && styles.recordingButton]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
              >
                <Ionicons 
                  name={isRecording ? "stop" : "mic"} 
                  size={24} 
                  color={isRecording ? "#ff3040" : "#fff"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>Delete Message</Text>
            <Text style={styles.deleteModalText}>Are you sure you want to delete this message?</Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteButton]}
                onPress={() => confirmDeleteMessage(false)}
              >
                <Text style={styles.deleteButtonText}>Delete for Me</Text>
              </TouchableOpacity>
              
              {messageToDelete?.senderId === user?.id && (
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteForEveryoneButton]}
                  onPress={() => confirmDeleteMessage(true)}
                >
                  <Text style={styles.deleteForEveryoneButtonText}>Delete for Everyone</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={(uri) => {
          const isVideo = uri.includes('.mov') || uri.includes('.mp4');
          sendMediaMessage(uri, isVideo ? 'video' : 'image');
        }}
      />
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
  },
  messagesContentContainer: {
    paddingVertical: 8,
    paddingBottom: 20,
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
    paddingVertical: 12,
    paddingBottom: 16,
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
  // Delete icon styles
  deleteIcon: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
    zIndex: 1,
  },
  deleteIconLeft: {
    left: 10,
  },
  // Media message styles
  mediaMessage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  // Status icons
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveredIcon: {
    marginRight: 2,
  },
  // Delete modal styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 280,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  deleteModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ff3040',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteForEveryoneButton: {
    backgroundColor: '#ff6b6b',
  },
  deleteForEveryoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Video message styles
  videoContainer: {
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -15,
    marginLeft: -15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Audio message styles
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 150,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  waveBar: {
    width: 2,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 1,
    borderRadius: 1,
  },
  audioDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 48, 64, 0.2)',
  },
  deletedMessageText: {
    fontStyle: 'italic',
    opacity: 0.7,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  seenText: {
    fontSize: 10,
    color: '#0084ff',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default NewInstagramChatScreen;
