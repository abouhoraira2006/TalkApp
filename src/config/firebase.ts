import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDA2vaD1VLrSfoFLaeN2-L6hpdDu5jDv-w",
  authDomain: "talkapp2025.firebaseapp.com",
  projectId: "talkapp2025",
  storageBucket: "talkapp2025.firebasestorage.app",
  messagingSenderId: "369761423989",
  appId: "1:369761423989:web:060d6d026b0410cdae1e3c"
};

// Initialize Firebase only if it hasn't been initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export Firebase services
export const auth = firebase.auth();
export const db = firebase.firestore();

// Enable Firebase Auth persistence explicitly
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
    console.log('Firebase Auth persistence enabled explicitly');
  })
  .catch((error) => {
    console.log('Firebase Auth will use default React Native persistence');
  });

// Ensure Firebase is initialized
console.log('Firebase initialized successfully');

export default firebase;
