import { useState, useEffect } from 'react';
import firebase from '../config/firebase';
import { auth, db } from '../config/firebase';
import { User } from '../types';

export const useEmailAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!isMounted) return;
      
      try {
        if (firebaseUser) {
          const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
          if (!isMounted) return;
          
          if (userDoc.exists) {
            const userData = userDoc.data() as User;
            if (isMounted) {
              setUser(userData);
              setLoading(false);
            }
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
            if (isMounted) {
              setUser(userData);
              setLoading(false);
            }
          }
        } else {
          // User signed out
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error getting user data:', error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [])

  const checkUsernameAvailability = async (username: string) => {
    try {
      const usernameQuery = await db.collection('users').where('username', '==', username.toLowerCase()).get();
      return usernameQuery.empty;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  const validateUsername = (username: string) => {
    // Remove spaces and convert to lowercase
    const cleanUsername = username.replace(/\s/g, '').toLowerCase();
    
    // Check if username is valid (3-20 characters, alphanumeric and underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    
    if (!usernameRegex.test(cleanUsername)) {
      return { 
        isValid: false, 
        error: 'اسم المستخدم يجب أن يكون 3-20 حرف (أحرف وأرقام و _ فقط)',
        cleanUsername: cleanUsername
      };
    }
    
    return { isValid: true, error: '', cleanUsername: cleanUsername };
  };

  const signUp = async (email: string, password: string, name: string, username: string) => {
    setLoading(true);
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'تنسيق البريد الإلكتروني غير صحيح' };
      }

      // Validate password strength
      if (password.length < 6) {
        return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
      }

      // Validate name
      if (name.trim().length < 2) {
        return { success: false, error: 'الاسم يجب أن يكون حرفين على الأقل' };
      }

      // Validate username
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        return { success: false, error: usernameValidation.error };
      }

      // Check username availability
      const isUsernameAvailable = await checkUsernameAvailability(usernameValidation.cleanUsername);
      if (!isUsernameAvailable) {
        return { success: false, error: 'اسم المستخدم غير متاح' };
      }

      // Create user account
      const userCredential = await auth.createUserWithEmailAndPassword(email.trim().toLowerCase(), password);
      const user = userCredential.user;

      if (user) {
        try {
          // Create user document in Firestore
          const userData: User = {
            id: user.uid,
            email: user.email || '',
            name: name.trim(),
            username: usernameValidation.cleanUsername,
            photoUrl: '',
            online: true,
            lastSeen: Date.now(),
            typing: false,
          };

          console.log('Creating user document in Firestore:', userData);
          await db.collection('users').doc(user.uid).set(userData);
          console.log('User document created successfully in Firestore');
          console.log('User signed up successfully');
          return { success: true };
        } catch (firestoreError: any) {
          console.error('Error creating user document in Firestore:', firestoreError);
          // Delete the auth user if Firestore creation fails
          try {
            await user.delete();
            console.log('Auth user deleted due to Firestore error');
          } catch (deleteError) {
            console.error('Error deleting auth user:', deleteError);
          }
          return { success: false, error: 'فشل في حفظ بيانات المستخدم' };
        }
      }

      return { success: false, error: 'فشل في إنشاء الحساب' };
    } catch (error: any) {
      console.error('Error signing up:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        return { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
      } else if (error.code === 'auth/weak-password') {
        return { success: false, error: 'كلمة المرور ضعيفة جداً' };
      } else if (error.code === 'auth/invalid-email') {
        return { success: false, error: 'البريد الإلكتروني غير صحيح' };
      }
      
      return { success: false, error: `حدث خطأ أثناء إنشاء الحساب: ${error.message}` };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'تنسيق البريد الإلكتروني غير صحيح' };
      }

      await auth.signInWithEmailAndPassword(email.trim().toLowerCase(), password);
      console.log('User signed in successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error signing in:', error);
      let errorMessage = 'حدث خطأ في تسجيل الدخول';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'لا يوجد حساب بهذا البريد الإلكتروني';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'كلمة المرور غير صحيحة';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'تنسيق البريد الإلكتروني غير صحيح';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'تم تعطيل هذا الحساب';
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      let errorMessage = 'فشل في إرسال رابط إعادة التعيين';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'لا يوجد حساب بهذا البريد الإلكتروني';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'تنسيق البريد الإلكتروني غير صحيح';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  return { user, loading, signIn, signUp, signOut, resetPassword, checkUsernameAvailability, validateUsername };
};

