import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  style?: ViewStyle;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'medium',
  color = '#ef4444',
  textColor = '#ffffff',
  style,
}) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  const sizeStyles = {
    small: { minWidth: 16, height: 16, fontSize: 10 },
    medium: { minWidth: 20, height: 20, fontSize: 12 },
    large: { minWidth: 24, height: 24, fontSize: 14 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          minWidth: currentSize.minWidth,
          height: currentSize.height,
          borderRadius: currentSize.height / 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: textColor,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 1,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
