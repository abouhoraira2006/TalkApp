import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  photoUrl?: string;
  name: string;
  size?: number;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ 
  photoUrl, 
  name, 
  size = 40, 
  showOnlineStatus = false, 
  isOnline = false 
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {photoUrl ? (
        <Image 
          source={{ uri: photoUrl }} 
          style={[styles.avatar, avatarStyle]}
          defaultSource={require('../../assets/icon.png')}
        />
      ) : (
        <View style={[styles.fallbackAvatar, avatarStyle]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      
      {showOnlineStatus && (
        <View style={[
          styles.onlineIndicator, 
          { 
            backgroundColor: isOnline ? '#4CAF50' : '#666',
            width: size * 0.25,
            height: size * 0.25,
            borderRadius: size * 0.125,
            right: size * 0.05,
            bottom: size * 0.05,
          }
        ]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#262626',
  },
  fallbackAvatar: {
    backgroundColor: '#0084ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#000',
  },
});

export default Avatar;
