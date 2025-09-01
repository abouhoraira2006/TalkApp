import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageActionsProps {
  visible: boolean;
  onClose: () => void;
  onReply: () => void;
  onReact: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isCurrentUser: boolean;
  messageText: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  visible,
  onClose,
  onReply,
  onReact,
  onCopy,
  onDelete,
  isCurrentUser,
  messageText,
}) => {
  const handleCopy = () => {
    Clipboard.setString(messageText);
    Alert.alert('تم النسخ', 'تم نسخ الرسالة إلى الحافظة');
    onCopy();
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'حذف الرسالة',
      'هل أنت متأكد من حذف هذه الرسالة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: () => {
            onDelete();
            onClose();
          }
        }
      ]
    );
  };

  const actions = [
    {
      icon: 'heart-outline',
      label: 'إعجاب',
      onPress: () => {
        onReact();
        onClose();
      },
    },
    {
      icon: 'arrow-undo-outline',
      label: 'رد',
      onPress: () => {
        onReply();
        onClose();
      },
    },
    {
      icon: 'copy-outline',
      label: 'نسخ',
      onPress: handleCopy,
    },
  ];

  if (isCurrentUser) {
    actions.push({
      icon: 'trash-outline',
      label: 'حذف',
      onPress: handleDelete,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={action.onPress}
              >
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name={action.icon as any} 
                    size={24} 
                    color="#ffffff" 
                  />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    minWidth: 60,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MessageActions;
