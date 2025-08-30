import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { uploadMedia, generateFileName } from '../services/supabase';

interface MessageInputProps {
  onSendMessage: (text: string, type: 'text') => void;
  onSendMedia: (mediaUrl: string, type: 'image' | 'audio' | 'video') => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendMedia,
  onTyping,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSend = async () => {
    if (text.trim() && !disabled) {
      onSendMessage(text.trim(), 'text');
      setText('');
      onTyping(false);
    }
  };

  const handleTyping = (value: string) => {
    setText(value);
    onTyping(value.length > 0);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const fileName = generateFileName('image', 'jpg');
        const mediaUrl = await uploadMedia(result.assets[0].uri, 'image', fileName);
        
        if (mediaUrl) {
          onSendMedia(mediaUrl, 'image');
        } else {
          Alert.alert('Error', 'Failed to upload image');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const fileName = generateFileName('video', 'mp4');
        const mediaUrl = await uploadMedia(result.assets[0].uri, 'video', fileName);
        
        if (mediaUrl) {
          onSendMedia(mediaUrl, 'video');
        } else {
          Alert.alert('Error', 'Failed to upload video');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permission');
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
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);

      if (uri) {
        const fileName = generateFileName('audio', 'm4a');
        const mediaUrl = await uploadMedia(uri, 'audio', fileName);
        
        if (mediaUrl) {
          onSendMedia(mediaUrl, 'audio');
        } else {
          Alert.alert('Error', 'Failed to upload audio');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  return (
    <View className="flex-row items-center bg-gray-800 px-4 py-2 border-t border-gray-700">
      <TouchableOpacity
        onPress={pickImage}
        disabled={disabled}
        className="mr-2"
      >
        <Ionicons name="image" size={24} color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={pickVideo}
        disabled={disabled}
        className="mr-2"
      >
        <Ionicons name="videocam" size={24} color="#9ca3af" />
      </TouchableOpacity>

      <View className="flex-1 flex-row items-center bg-gray-700 rounded-2xl px-3 py-2 mr-2">
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          className="flex-1 text-white text-base"
          multiline
          maxLength={1000}
          editable={!disabled}
        />
      </View>

      {text.trim() ? (
        <TouchableOpacity
          onPress={handleSend}
          disabled={disabled}
          className="bg-primary-600 p-2 rounded-full"
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={disabled}
          className={`p-2 rounded-full ${
            isRecording ? 'bg-red-500' : 'bg-primary-600'
          }`}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};
