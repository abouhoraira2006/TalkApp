import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';
import { formatTime } from '../utils/formatTime';

interface ChatBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onLongPress?: () => void;
}

const { width } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = width * 0.75;

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwnMessage,
  onLongPress,
}) => {
  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <Text
            className={`text-base ${
              isOwnMessage ? 'text-white' : 'text-gray-900'
            }`}
          >
            {message.text}
          </Text>
        );
      
      case 'image':
        return (
          <Image
            source={{ uri: message.mediaUrl! }}
            className="w-48 h-48 rounded-lg"
            resizeMode="cover"
          />
        );
      
      case 'video':
        return (
          <View className="w-48 h-48 bg-gray-800 rounded-lg items-center justify-center">
            <Ionicons name="play-circle" size={48} color="white" />
            <Text className="text-white text-sm mt-2">Video</Text>
          </View>
        );
      
      case 'audio':
        return (
          <View className="flex-row items-center bg-gray-100 px-4 py-2 rounded-full">
            <Ionicons name="play" size={20} color="#0ea5e9" />
            <Text className="text-gray-700 ml-2">Audio Message</Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return <Ionicons name="checkmark" size={16} color="#9ca3af" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={16} color="#9ca3af" />;
      case 'seen':
        return <Ionicons name="checkmark-done" size={16} color="#0ea5e9" />;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      className={`mb-2 ${isOwnMessage ? 'items-end' : 'items-start'}`}
    >
      <View
        className={`max-w-[${MAX_BUBBLE_WIDTH}px] px-4 py-2 rounded-2xl ${
          isOwnMessage
            ? 'bg-primary-600 rounded-br-md'
            : 'bg-gray-200 rounded-bl-md'
        }`}
      >
        {renderMessageContent()}
        
        <View
          className={`flex-row items-center mt-1 ${
            isOwnMessage ? 'justify-end' : 'justify-start'
          }`}
        >
          <Text
            className={`text-xs ${
              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
            } mr-1`}
          >
            {formatTime(message.timestamp)}
          </Text>
          {isOwnMessage && getStatusIcon()}
        </View>
      </View>
    </TouchableOpacity>
  );
};
