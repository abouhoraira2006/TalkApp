import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReplyMessage {
  id: string;
  text: string;
  senderName: string;
}

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendImage?: () => void;
  onSendAudio?: () => void;
  onTyping?: (text: string) => void;
  replyTo?: ReplyMessage | null;
  onCancelReply?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendImage,
  onSendAudio,
  onTyping,
  replyTo,
  onCancelReply,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleLongPressAudio = () => {
    setIsRecording(true);
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      useNativeDriver: true,
    }).start();
    
    // TODO: Start audio recording
    console.log('Start recording audio');
  };

  const handleReleaseAudio = () => {
    setIsRecording(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    
    // TODO: Stop and send audio recording
    console.log('Stop recording and send audio');
    if (onSendAudio) {
      onSendAudio();
    }
  };

  const renderReplyPreview = () => {
    if (!replyTo) return null;

    return (
      <View style={styles.replyPreview}>
        <View style={styles.replyLine} />
        <View style={styles.replyContent}>
          <Text style={styles.replyToText}>الرد على {replyTo.senderName}</Text>
          <Text style={styles.replyMessageText} numberOfLines={1}>
            {replyTo.text}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancelReply} style={styles.cancelReply}>
          <Ionicons name="close" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderReplyPreview()}
      
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={onSendImage} style={styles.attachButton}>
          <Ionicons name="camera" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              if (onTyping) {
                onTyping(text);
              }
            }}
            placeholder="اكتب رسالة..."
            placeholderTextColor="#6b7280"
            multiline
            maxLength={1000}
          />
        </View>

        {message.trim() ? (
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              onPressIn={handleLongPressAudio}
              onPressOut={handleReleaseAudio}
              style={[
                styles.audioButton,
                { backgroundColor: isRecording ? '#ef4444' : '#0ea5e9' }
              ]}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={20} 
                color="#ffffff" 
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  replyLine: {
    width: 3,
    height: 40,
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
    marginRight: 12,
  },
  replyContent: {
    flex: 1,
  },
  replyToText: {
    color: '#0ea5e9',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyMessageText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  cancelReply: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  textInput: {
    color: '#ffffff',
    fontSize: 16,
    textAlignVertical: 'center',
    minHeight: 36,
  },
  sendButton: {
    backgroundColor: '#0ea5e9',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
});

export default ChatInput;
