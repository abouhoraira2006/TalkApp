import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { User } from '../types';

export const useSimpleAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
          if (userDoc.exists) {
            setUser(userDoc.data() as User);
          } else {
            const userData: User = {
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
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
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
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return { user, loading, signIn, signUp, signOut };
};
