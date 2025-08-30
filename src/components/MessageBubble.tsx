import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: {
    type?: string;
    image?: string;
    audio?: string;
    text?: string;
  };
  isCurrentUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser }) => {
  const renderContent = () => {
    if (message.type === 'image' && message.image) {
      return (
        <Image
          source={{ uri: message.image }}
          style={{
            width: 200,
            height: 150,
            borderRadius: 10,
            marginBottom: message.text ? 8 : 0,
          }}
          resizeMode="cover"
        />
      );
    }

    if (message.type === 'audio' && message.audio) {
      return (
        <TouchableOpacity
          style={{
            backgroundColor: isCurrentUser ? '#1f2937' : '#374151',
            padding: 12,
            borderRadius: 15,
            flexDirection: 'row',
            alignItems: 'center',
            minWidth: 120,
          }}
          onPress={() => {
            console.log('Playing audio:', message.audio);
            // TODO: Implement audio playback
          }}
        >
          <Ionicons name="play" size={20} color="#ffffff" />
          <Text style={{ color: '#ffffff', marginLeft: 8 }}>رسالة صوتية</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View>
      {renderContent()}
      {message.text && (
        <Text style={{ color: '#ffffff', fontSize: 16 }}>
          {message.text}
        </Text>
      )}
    </View>
  );
};

export default MessageBubble;
