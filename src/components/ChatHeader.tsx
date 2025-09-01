import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatHeaderProps {
  otherUserName: string;
  isOnline?: boolean;
  lastSeen?: number;
  onBack: () => void;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  onInfo?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  otherUserName,
  isOnline,
  lastSeen,
  onBack,
  onVideoCall,
  onVoiceCall,
  onInfo,
}) => {
  const getLastSeenText = () => {
    if (isOnline) return 'متصل الآن';
    if (!lastSeen) return 'غير متصل';
    
    const now = Date.now();
    const diff = now - lastSeen;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'متصل الآن';
    if (minutes < 60) return `آخر ظهور منذ ${minutes} دقيقة`;
    if (hours < 24) return `آخر ظهور منذ ${hours} ساعة`;
    return `آخر ظهور منذ ${days} يوم`;
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onInfo} style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherUserName.charAt(0).toUpperCase()}
              </Text>
              {isOnline && <View style={styles.onlineIndicator} />}
            </View>
            
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{otherUserName}</Text>
              <Text style={styles.lastSeen}>{getLastSeenText()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity onPress={onVoiceCall} style={styles.actionButton}>
            <Ionicons name="call" size={22} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onVideoCall} style={styles.actionButton}>
            <Ionicons name="videocam" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  nameContainer: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastSeen: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default ChatHeader;
