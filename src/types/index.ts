export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  photoUrl: string;
  online: boolean;
  lastSeen: number;
  typing: boolean;
}

export interface Message {
  _id: string;
  text?: string;
  createdAt: Date;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  senderId: string;
  receiverId: string;
  mediaUrl?: string;
  type: 'text' | 'image' | 'audio';
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
  // Gifted Chat specific fields
  image?: string;
  audio?: string;
  video?: string;
  // WhatsApp-like features
  replyTo?: {
    messageId: string;
    text?: string;
    image?: string;
    audio?: string;
    userName: string;
  };
  reactions?: {
    [userId: string]: string; // emoji
  };
  edited?: boolean;
  editedAt?: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface Chat {
  id: string;
  participants: string[];
  participantDetails: User[];
  lastMessage?: Message;
  lastMessageTime?: number;
  unreadCount?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'system' | 'update';
  timestamp: number;
  read: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Chat: { chatId: string; otherUser: User };
  Search: undefined;
  Profile: undefined;
  Notifications: undefined;
};

export type MainTabParamList = {
  ChatList: undefined;
  Search: undefined;
  Notifications: undefined;
  Profile: undefined;
};
