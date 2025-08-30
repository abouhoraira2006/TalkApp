export const formatTime = (timestamp: number): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return messageDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
};

export const formatLastSeen = (timestamp: number): string => {
  const now = new Date();
  const lastSeenDate = new Date(timestamp);
  const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${Math.floor(diffInMinutes)}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
};

export const generateChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

export const isToday = (timestamp: number): boolean => {
  const today = new Date();
  const messageDate = new Date(timestamp);
  return today.toDateString() === messageDate.toDateString();
};

export const isYesterday = (timestamp: number): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(timestamp);
  return yesterday.toDateString() === messageDate.toDateString();
};
