import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (reaction: string) => void;
  position?: { x: number; y: number };
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎'];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onClose,
  onSelectReaction,
  position = { x: 0, y: 0 },
}) => {
  const handleReactionSelect = (reaction: string) => {
    onSelectReaction(reaction);
    onClose();
  };

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
        <View
          style={[
            styles.container,
            {
              top: position.y - 60,
              left: Math.max(10, Math.min(position.x - 140, 300)),
            },
          ]}
        >
          <View style={styles.reactionsRow}>
            {REACTIONS.map((reaction, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reactionButton}
                onPress={() => handleReactionSelect(reaction)}
              >
                <Text style={styles.reactionEmoji}>{reaction}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    position: 'absolute',
    backgroundColor: '#374151',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  reactionEmoji: {
    fontSize: 20,
  },
});

export default ReactionPicker;
