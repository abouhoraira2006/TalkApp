import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Message, User, Chat } from '../types';
import { generateChatId } from '../utils/formatTime';

// Users
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));
    if (!userDoc.empty) {
      return userDoc.docs[0].data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const updateUserStatus = async (userId: string, online: boolean) => {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));
    if (!userDoc.empty) {
      await updateDoc(doc(db, 'users', userDoc.docs[0].id), {
        online,
        lastSeen: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

export const updateUserTyping = async (userId: string, typing: boolean) => {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));
    if (!userDoc.empty) {
      await updateDoc(doc(db, 'users', userDoc.docs[0].id), {
        typing,
      });
    }
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => doc.data() as User);
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

// Messages
export const sendMessage = async (message: Omit<Message, 'id' | 'timestamp'>): Promise<string> => {
  try {
    const messageData = {
      ...message,
      timestamp: Date.now(),
    };
    
    const chatId = generateChatId(message.senderId, message.receiverId);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const docRef = await addDoc(messagesRef, messageData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const updateMessageStatus = async (
  chatId: string,
  messageId: string,
  status: Message['status']
) => {
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      status,
    });
  } catch (error) {
    console.error('Error updating message status:', error);
  }
};

export const deleteMessage = async (chatId: string, messageId: string) => {
  try {
    await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

export const getMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
    callback(messages);
  });
};

export const subscribeToUserStatus = (
  userId: string,
  callback: (user: User | null) => void
) => {
  const q = query(collection(db, 'users'), where('id', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const user = snapshot.docs[0].data() as User;
      callback(user);
    } else {
      callback(null);
    }
  });
};

// Chats
export const getChatsForUser = async (userId: string): Promise<Chat[]> => {
  try {
    const chats: Chat[] = [];
    const users = await getAllUsers();
    
    for (const user of users) {
      if (user.id !== userId) {
        const chatId = generateChatId(userId, user.id);
        const messages = await getMessages(chatId);
        
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
        
        chats.push({
          id: chatId,
          participants: [userId, user.id],
          lastMessage,
          lastMessageTime: lastMessage?.timestamp,
        });
      }
    }
    
    return chats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  } catch (error) {
    console.error('Error getting chats:', error);
    return [];
  }
};

export const subscribeToChats = (
  userId: string,
  callback: (chats: Chat[]) => void
) => {
  // This is a simplified version - in a real app, you'd want to optimize this
  const unsubscribe = onSnapshot(collection(db, 'users'), async () => {
    const chats = await getChatsForUser(userId);
    callback(chats);
  });
  
  return unsubscribe;
};
