import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isTyping,
  userName = 'Someone',
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isTyping) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isTyping]);

  if (!isTyping) return null;

  return (
    <View className="flex-row items-center px-4 py-2 bg-gray-200 rounded-2xl rounded-bl-md mb-2 self-start">
      <View className="flex-row items-center">
        <View className="flex-row space-x-1 mr-2">
          <View className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
          <View className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <View className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </View>
        <Text className="text-gray-600 text-sm">
          {userName} is typing{dots}
        </Text>
      </View>
    </View>
  );
};
