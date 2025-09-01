import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Animated, 
  PanResponder,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageActions from './MessageActions';

const { width: screenWidth } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
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

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  currentUserId: string;
  onReply?: (message: Message) => void;
  onReaction?: (messageId: string, reaction: string) => void;
  onShowTime?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  senderName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isCurrentUser, 
  currentUserId,
  onReply,
  onReaction,
  onShowTime,
  onDelete,
  senderName 
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [showActions, setShowActions] = useState(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      const maxSwipe = 80;
      const swipeDistance = isCurrentUser 
        ? Math.max(-maxSwipe, gestureState.dx)
        : Math.min(maxSwipe, gestureState.dx);
      
      translateX.setValue(swipeDistance);
      
      const opacityValue = Math.abs(swipeDistance) / maxSwipe;
      opacity.setValue(opacityValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      const threshold = 40;
      const swipeDistance = Math.abs(gestureState.dx);
      
      if (swipeDistance > threshold) {
        if (onReply) {
          onReply(message);
        }
      }
      
      // Reset animation with slower timing
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    },
  });

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;
    
    return (
      <View style={styles.replyContainer}>
        <Text style={styles.replyLabel}>تم الرد على</Text>
        <View style={[
          styles.replyPreview,
          { backgroundColor: isCurrentUser ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)' }
        ]}>
          <View style={[
            styles.replyLine,
            { backgroundColor: isCurrentUser ? 'rgba(255, 255, 255, 0.6)' : '#0ea5e9' }
          ]} />
          <Text style={styles.replyText} numberOfLines={1}>
            {message.replyTo.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
    
    const reactions = Object.entries(message.reactions);
    
    return (
      <View style={[
        styles.reactionsContainer,
        { alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }
      ]}>
        {reactions.map(([userId, reaction], index) => (
          <TouchableOpacity
            key={`${userId}-${index}`}
            style={styles.reactionBubble}
            onPress={() => onReaction?.(message.id, reaction)}
          >
            <Text style={styles.reactionEmoji}>{reaction}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMessageContent = () => {
    if (message.type === 'image' && message.image) {
      return (
        <Image
          source={{ uri: message.image }}
          style={styles.messageImage}
          resizeMode="cover"
        />
      );
    }

    if (message.type === 'audio' && message.audio) {
      return (
        <TouchableOpacity style={styles.audioMessage}>
          <Ionicons name="play" size={20} color="#ffffff" />
          <Text style={styles.audioText}>رسالة صوتية</Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text style={[
        styles.messageText,
        { color: isCurrentUser ? '#ffffff' : '#ffffff' }
      ]}>
        {message.text}
      </Text>
    );
  };

  return (
    <View style={[
      styles.messageContainer,
      { alignItems: isCurrentUser ? 'flex-end' : 'flex-start' }
    ]}>
      {/* Reply Icon */}
      <Animated.View
        style={[
          styles.replyIcon,
          {
            opacity,
            [isCurrentUser ? 'right' : 'left']: 10,
          },
        ]}
      >
        <Ionicons name="arrow-undo" size={20} color="#9ca3af" />
      </Animated.View>

      {/* Message Bubble */}
      <Animated.View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isCurrentUser ? '#0ea5e9' : '#374151',
            transform: [{ translateX }],
            maxWidth: screenWidth * 0.75,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onLongPress={() => setShowActions(true)}
          activeOpacity={0.8}
        >
          {renderReplyPreview()}
          {renderMessageContent()}
        
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString('ar', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isCurrentUser && (
            <Ionicons 
              name="checkmark-done" 
              size={14} 
              color="#0ea5e9" 
              style={styles.seenIcon}
            />
          )}
        </View>
      </TouchableOpacity>
      </Animated.View>

      {renderReactions()}
      
      <MessageActions
        visible={showActions}
        onClose={() => setShowActions(false)}
        onReply={() => onReply?.(message)}
        onReact={() => onReaction?.(message.id, '❤️')}
        onCopy={() => {}}
        onDelete={() => onDelete?.(message.id)}
        isCurrentUser={isCurrentUser}
        messageText={message.text}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 16,
    position: 'relative',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 60,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },
  audioText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  seenIcon: {
    marginLeft: 4,
  },
  replyContainer: {
    marginBottom: 6,
  },
  replyLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
    fontWeight: '500',
  },
  replyPreview: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  replyLine: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  replyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    marginHorizontal: 16,
  },
  reactionBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  replyIcon: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
});

export default MessageBubble;
