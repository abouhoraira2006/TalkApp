import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { User } from '../types';

// Import AsyncStorage with error handling
let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
  console.warn('AsyncStorage not available:', error);
}

const STORAGE_KEY = '@TalkApp:user';

export const useSimpleAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authInitialized = false;
    
    // Load stored user immediately on app start
    const loadStoredUser = async () => {
      try {
        console.log('Loading stored user...');
        if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
          const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
          if (storedUser && isMounted) {
            const userData = JSON.parse(storedUser);
            console.log('Found stored user:', userData.email);
            setUser(userData);
            
            // Don't try to sign in automatically - just use stored data
            console.log('Using stored user data without Firebase auth');
          }
        } else {
          console.log('AsyncStorage not available');
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStoredUser();

    // Simplified Firebase auth listener - don't interfere with stored user
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!isMounted) return;
      
      // Only log, don't change user state based on Firebase auth
      console.log('Firebase auth state:', firebaseUser ? 'signed in' : 'signed out');
      
      // Only update if we have a Firebase user AND no stored user yet
      if (firebaseUser && !user) {
        try {
          const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
          let userData: User;
          
          if (userDoc.exists) {
            userData = userDoc.data() as User;
          } else {
            userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'مستخدم',
              username: firebaseUser.email?.split('@')[0] || 'user',
              photoUrl: firebaseUser.photoURL || '',
              online: true,
              lastSeen: Date.now(),
              typing: false,
            };
            await db.collection('users').doc(firebaseUser.uid).set(userData);
          }
          
          if (isMounted) {
            setUser(userData);
            console.log('Setting user from Firebase auth...');
            if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            }
          }
        } catch (error) {
          console.error('Error fetching user from Firebase:', error);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await auth.signInWithEmailAndPassword(email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email: string, password: string, name: string, username?: string) => {
    try {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      const userData: User = {
        id: result.user!.uid,
        email: email,
        name: name,
        username: username || email.split('@')[0],
        photoUrl: '',
        online: true,
        lastSeen: Date.now(),
        typing: false,
      };
      await db.collection('users').doc(result.user!.uid).set(userData);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      setUser(null);
      
      // Safe AsyncStorage removal
      try {
        if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
          await AsyncStorage.removeItem(STORAGE_KEY);
          console.log('User data removed from storage');
        } else {
          console.log('AsyncStorage not available');
        }
      } catch (storageError) {
        console.log('Error removing data from storage:', storageError);
      }
      
      await auth.signOut();
      console.log('Firebase sign out completed');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return { user, loading, signIn, signUp, signOut };
};
