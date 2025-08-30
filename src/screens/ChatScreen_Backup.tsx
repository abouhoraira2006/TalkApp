import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  ActionSheetIOS,
  TextInput,
} from 'react-native';
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, Actions, Time } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useEmailAuth } from '../services/auth';
import { db } from '../config/firebase';
import { supabase, STORAGE_BUCKET } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import firebase from 'firebase/compat/app';
import { User, Message } from '../types';

interface ChatScreenProps {
  route: {
    params: {
      chatId?: string;
      otherUser: User;
    };
  };
  navigation: any;
}


const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { user } = useEmailAuth();
  const { chatId: initialChatId, otherUser } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(initialChatId || null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    if (!user) return;

    if (!chatId) {
      findOrCreateChat();
    } else {
      subscribeToMessages();
      subscribeToTyping();
      markMessagesAsRead();
    }
  }, [user, chatId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Mark all messages as read when entering chat
  const markMessagesAsRead = async () => {
    if (!chatId || !user) return;
    
    try {
      const unreadMessages = await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .where('receiverId', '==', user.id)
        .where('status', '!=', 'read')
        .get();
        
      unreadMessages.docs.forEach((doc) => {
        doc.ref.update({ status: 'read' });
      });
    } catch (error) {
      console.log('Error marking messages as read:', error);
    }
  };

  // Subscribe to typing indicators
  const subscribeToTyping = () => {
    if (!chatId || !user) return;

    const unsubscribe = db
      .collection('chats')
      .doc(chatId)
      .onSnapshot((doc) => {
        const data = doc.data();
        if (data?.typing) {
          const otherUserTyping = data.typing[otherUser.id];
          setOtherUserTyping(otherUserTyping || false);
        }
      });

    return unsubscribe;
  };

  // Update typing status
  const updateTypingStatus = async (typing: boolean) => {
    if (!chatId || !user) return;

    try {
      await db.collection('chats').doc(chatId).update({
        [`typing.${user.id}`]: typing,
      });
    } catch (error) {
      console.log('Error updating typing status:', error);
    }
  };

  // Handle text input changes for typing indicator
  const onInputTextChanged = (text: string) => {
    setInputText(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
      
      // Stop typing after 3 seconds of inactivity
      setTimeout(() => {
        setIsTyping(false);
        updateTypingStatus(false);
      }, 3000);
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      updateTypingStatus(false);
    }
  };

  const findOrCreateChat = async () => {
    if (!user) return;

    try {
      const existingChat = await db
        .collection('chats')
        .where('participants', 'array-contains', user.id)
        .get();

      let foundChatId = null;
      existingChat.docs.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(otherUser.id)) {
          foundChatId = doc.id;
        }
      });

      if (foundChatId) {
        setChatId(foundChatId);
      } else {
        const newChatRef = await db.collection('chats').add({
          participants: [user.id, otherUser.id],
          createdAt: Date.now(),
          lastMessageTime: Date.now(),
          lastMessage: null,
          unreadCount: 0,
        });
        setChatId(newChatRef.id);
      }
    } catch (error) {
      console.error('Error finding/creating chat:', error);
      Alert.alert('خطأ', 'فشل في إنشاء المحادثة');
    }
  };

  const subscribeToMessages = () => {
    if (!chatId || !user) return;

    const unsubscribe = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const messageList: IMessage[] = [];
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const message: IMessage = {
            _id: data._id || doc.id,
            text: data.text || '',
            createdAt: new Date(data.timestamp),
            user: {
              _id: data.senderId,
              name: data.senderId === user.id ? user.name : otherUser.name,
              avatar: data.senderId === user.id ? user.photoUrl : otherUser.photoUrl,
            },
            // Add media URLs if present
            ...(data.type === 'image' && data.image && { image: data.image }),
            ...(data.type === 'audio' && data.audio && { audio: data.audio }),
            // Add custom properties for status tracking
            status: data.status,
            edited: data.edited,
          };
          messageList.push(message);
        });
        
        setMessages(messageList);
      });

    return unsubscribe;
  };

  const onSend = useCallback(async (messages: IMessage[] = []) => {
    console.log('onSend called with messages:', messages);
    if (!user || !chatId) {
      console.log('Missing user or chatId:', { user: !!user, chatId });
      return;
    }

    const message = messages[0];
    console.log('Processing message:', message);
    
    const messageData: Message = {
      _id: message._id as string,
      text: message.text || '',
      createdAt: new Date(),
      user: {
        _id: user.id,
        name: user.name,
        avatar: user.photoUrl || '',
      },
      senderId: user.id,
      receiverId: otherUser.id,
      timestamp: Date.now(),
      status: 'sent',
      type: 'text',
    };

    try {
      console.log('Sending message to Firestore:', messageData);
      
      // Add message to Firestore
      await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(message._id as string)
        .set({
          _id: messageData._id,
          text: messageData.text,
          senderId: messageData.senderId,
          receiverId: messageData.receiverId,
          timestamp: messageData.timestamp,
          status: messageData.status,
          type: messageData.type,
        });

      console.log('Message sent successfully');

      // Update chat's last message
      await db.collection('chats').doc(chatId).update({
        lastMessage: message.text,
        lastMessageTime: Date.now(),
        [`unreadCount.${otherUser.id}`]: firebase.firestore.FieldValue.increment(1),
      });

      // Clear input text after sending
      setInputText('');
      
      // Mark message as delivered after 1 second
      setTimeout(async () => {
        try {
          const messageRef = await db
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .where('receiverId', '==', user.id)
            .where('status', '==', 'sent')
            .get();
            
          messageRef.docs.forEach((doc) => {
            doc.ref.update({ status: 'delivered' });
          });
        } catch (error) {
          console.log('Error updating message status:', error);
        }
      }, 1000);
      
      // Mark messages as read when other user opens chat
      setTimeout(async () => {
        try {
          const unreadMessages = await db
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .where('receiverId', '==', user.id)
            .where('status', '!=', 'read')
            .get();
            
          unreadMessages.docs.forEach((doc) => {
            doc.ref.update({ status: 'read' });
          });
        } catch (error) {
          console.log('Error marking messages as read:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('خطأ', 'فشل في إرسال الرسالة');
    }
  }, [user, chatId, otherUser]);

  // Upload file to Supabase Storage
  const uploadToSupabase = async (uri: string, fileName: string, fileType: 'image' | 'audio'): Promise<string | null> => {
    try {
      console.log('Starting upload to Supabase:', { uri, fileName, fileType });
      
      // Read file as blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fullFileName = `${fileType}s/${Date.now()}-${fileName}`;
      console.log('Uploading file:', fullFileName);
      
      // Use Supabase client for upload
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fullFileName, blob, {
          contentType: fileType === 'image' ? 'image/jpeg' : 'audio/m4a',
          upsert: true,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return null;
      }

      console.log('File uploaded successfully:', data);
      
      // Get public URL
      const { data: publicData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);
      
      console.log('Public URL:', publicData.publicUrl);
      return publicData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Handle image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('خطأ', 'نحتاج إذن للوصول للمعرض');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      console.log('Uploading image:', imageUri);
      const imageUrl = await uploadToSupabase(imageUri, 'image.jpg', 'image');
      
      if (imageUrl) {
        console.log('Image uploaded successfully:', imageUrl);
        if (!user || !chatId) return;
        
        const messageData = {
          _id: Date.now().toString(),
          text: '',
          senderId: user.id,
          receiverId: otherUser.id,
          timestamp: Date.now(),
          status: 'sent',
          type: 'image',
          image: imageUrl,
        };

        // Save to Firestore
        await db
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .doc(messageData._id)
          .set(messageData);

        await db.collection('chats').doc(chatId).update({
          lastMessage: 'صورة',
          lastMessageTime: Date.now(),
          [`unreadCount.${otherUser.id}`]: firebase.firestore.FieldValue.increment(1),
        });
      } else {
        Alert.alert('خطأ', 'فشل في رفع الصورة');
      }
    }
  };

  // Handle camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('خطأ', 'نحتاج إذن للوصول للكاميرا');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      console.log('Uploading camera photo:', imageUri);
      const imageUrl = await uploadToSupabase(imageUri, 'camera.jpg', 'image');
      
      if (imageUrl) {
        console.log('Camera photo uploaded successfully:', imageUrl);
        if (!user || !chatId) return;
        
        const messageData = {
          _id: Date.now().toString(),
          text: '',
          senderId: user.id,
          receiverId: otherUser.id,
          timestamp: Date.now(),
          status: 'sent',
          type: 'image',
          image: imageUrl,
        };

        // Save to Firestore
        await db
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .doc(messageData._id)
          .set(messageData);

        await db.collection('chats').doc(chatId).update({
          lastMessage: 'صورة',
          lastMessageTime: Date.now(),
          [`unreadCount.${otherUser.id}`]: firebase.firestore.FieldValue.increment(1),
        });
      } else {
        Alert.alert('خطأ', 'فشل في رفع الصورة');
      }

  // Handle voice recording
  const startRecording = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }
    
    try {
      console.log('Starting voice recording...');
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إذن للوصول للميكروفون');
        return;
      }

      // Stop any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('Error stopping existing recording:', e);
        }
        setRecording(null);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('خطأ', 'فشل في بدء التسجيل');
      setIsRecording(false);
      setRecording(null);
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) return;

    try {
      console.log('Stopping recording...');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording stopped, URI:', uri);
      
      if (uri && user && chatId) {
        const audioUrl = await uploadToSupabase(uri, 'voice.m4a', 'audio');
        
        if (audioUrl) {
          console.log('Audio uploaded successfully:', audioUrl);
          const messageData = {
            _id: Date.now().toString(),
            text: '',
            senderId: user.id,
            receiverId: otherUser.id,
            timestamp: Date.now(),
            status: 'sent',
            type: 'audio',
            audio: audioUrl,
          };

          // Save to Firestore
          await db
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .doc(messageData._id)
            .set(messageData);

          await db.collection('chats').doc(chatId).update({
            lastMessage: 'رسالة صوتية',
            lastMessageTime: Date.now(),
            [`unreadCount.${otherUser.id}`]: firebase.firestore.FieldValue.increment(1),
          });
        } else {
          Alert.alert('خطأ', 'فشل في رفع التسجيل الصوتي');
        }
      }
      setRecording(null);
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('خطأ', 'فشل في إرسال الرسالة الصوتية');
      setRecording(null);
      setIsRecording(false);
    }
  };

  // Handle action sheet for media options
  const onPressActionButton = () => {
    const options = ['إلغاء', 'كاميرا', 'معرض الصور', 'تسجيل صوتي'];
    const cancelButtonIndex = 0;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          } else if (buttonIndex === 3) {
            startRecording();
          }
        }
      );
    } else {
      Alert.alert(
        'اختر عملية',
        '',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'كاميرا', onPress: takePhoto },
          { text: 'معرض الصور', onPress: pickImage },
          { text: 'تسجيل صوتي', onPress: startRecording },
        ]
      );
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const renderBubble = (props: any) => {
    const message = props.currentMessage;
    const isMyMessage = message?.user?._id === user?.id;
    
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#1f2937',
            marginRight: 8,
            marginVertical: 2,
            borderRadius: 18,
            maxWidth: '80%',
          },
          left: {
            backgroundColor: '#374151',
          }}>
            {timeProps.currentMessage?.createdAt
              ? new Date(timeProps.currentMessage.createdAt).toLocaleTimeString('ar', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>
          {/* Message status indicators inside bubble */}
          {isMyMessage && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {(message as any)?.status === 'sent' && (
                <Ionicons name="checkmark" size={12} color="#9ca3af" />
              )}
              {(message as any)?.status === 'delivered' && (
                <View style={{ flexDirection: 'row' }}>
                  <Ionicons name="checkmark" size={12} color="#9ca3af" />
                  <Ionicons name="checkmark" size={12} color="#9ca3af" style={{ marginLeft: -8 }} />
                </View>
              )}
              {(message as any)?.status === 'read' && (
                <View style={{ flexDirection: 'row' }}>
                  <Ionicons name="checkmark" size={12} color="#4fc3f7" />
                  <Ionicons name="checkmark" size={12} color="#4fc3f7" style={{ marginLeft: -8 }} />
                </View>
              )}
              {(message as any)?.edited && (
                <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>محرر</Text>
              )}
            </View>
          )}
        </View>
      )}
    />
  );
};

const renderInputToolbar = (props: any) => {
  return (
    <View style={{
      backgroundColor: '#1f2937',
      borderTopWidth: 0,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingBottom: Platform.OS === 'ios' ? 34 : 8,
    }}>
      {/* Attachment button - only show when not typing */}
      {inputText.trim().length === 0 && (
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#374151',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
            marginBottom: 4,
          }}
          onPress={onPressActionButton}
        >
          <Ionicons name="attach" size={20} color="#ffffff" />
        </TouchableOpacity>
      )}
      
      {/* Text input */}
      <TextInput
        style={{
          flex: 1,
          color: '#ffffff',
          backgroundColor: '#374151',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginVertical: 4,
          maxHeight: 100,
          textAlign: 'right',
          fontSize: 16,
        }}
        placeholder="اكتب رسالة..."
        placeholderTextColor="#9ca3af"
        multiline
        value={inputText}
        onChangeText={setInputText}
      />
      
      {/* Send/Mic button */}
      <TouchableOpacity
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: inputText.trim().length > 0 ? '#10b981' : (isRecording ? '#ef4444' : '#6b7280'),
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: 8,
          marginBottom: 4,
        }}
        onPress={() => {
          if (inputText.trim().length > 0) {
            const message = {
              _id: Date.now().toString(),
              text: inputText.trim(),
              createdAt: new Date(),
              user: {
                _id: user?.id || '',
                name: user?.name || '',
                avatar: user?.photoUrl || '',
              },
            };
            onSend([message]);
          } else {
            startRecording();
          }
        }}
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
            avatar: user?.photoUrl || undefined,
          }}
          renderBubble={renderBubble}
          renderInputToolbar={() => null}
          renderSend={() => null}
          renderActions={() => null}
          renderTime={() => null}
          renderMessageAudio={(props) => (
            <TouchableOpacity
              style={{
                backgroundColor: '#374151',
                padding: 10,
                borderRadius: 15,
                margin: 5,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => {
                console.log('Playing audio:', props.currentMessage?.audio);
              }}
            >
              <Ionicons name="play" size={20} color="#ffffff" />
              <Text style={{ color: '#ffffff', marginLeft: 8 }}>رسالة صوتية</Text>
            </TouchableOpacity>
          )}
          placeholder="اكتب رسالة..."
          alwaysShowSend={false}
          scrollToBottom
          isTyping={otherUserTyping}
          locale="ar"
          dateFormat="DD/MM/YYYY"
          timeFormat="HH:mm"
          messagesContainerStyle={{
            backgroundColor: '#111827',
          }}
          bottomOffset={Platform.OS === 'ios' ? 90 : 60}
          minInputToolbarHeight={0}
          isKeyboardInternallyHandled={false}
          keyboardShouldPersistTaps="handled"
        />
        
        {/* Custom Input Toolbar */}
        {renderInputToolbar({})}
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatScreen;
    marginTop: 50,
  },
});

export default ChatScreen;
