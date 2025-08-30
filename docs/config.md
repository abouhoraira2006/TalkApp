
# Chat App Project Configuration

## Project Overview
A lightweight chat application built with **Expo (React Native)** targeting **Android only**, designed to work similarly to WhatsApp but simplified:

- **Text messages** stored temporarily in **Firebase Firestore**.
- **Media files (images, audio, videos, voice messages)** stored temporarily in **Supabase Storage**.
- Messages and media are deleted after being received by the other device.
- Google Sign-In is used for authentication, with the user’s Google profile picture as their chat avatar.
- The app uses Arabic as the default language and dark mode as the default theme.
- App is designed for **friends-only communication**, no public/global access required.

---

## Core Features
1. **Authentication**
   - Google Sign-In using `expo-auth-session`.
   - Store user details (id, name, email, photoUrl).

2. **Chats**
   - Real-time text messages via Firebase Firestore.
   - Messages are deleted after delivery confirmation.
   - Message status: `sent`, `delivered`, `seen`.
   - Typing indicator ("user is typing…").
   - Lock status if message not delivered.

3. **Media**
   - Images, videos, and voice messages uploaded to **Supabase Storage** (`chat-files` bucket).
   - URLs stored in Firestore messages.
   - Media deleted from Supabase once received by the other user.
   - Voice messages recorded and played with `expo-av`.
   - Files handled with `expo-file-system`.

4. **User Presence**
   - Show **online / last seen** based on Firestore `lastSeen`.
   - Typing status (`typing: true/false`).

5. **Notifications**
   - In-app notifications page for new messages/alerts.
   - Push notifications (optional via Expo Notifications).

---

## Pages / Screens
- **LoginScreen** → Google authentication.
- **ChatListScreen** → List of all conversations, with search bar and new chat button.
- **ChatScreen** → Full chat view with messages, media, typing indicator, and message status.
- **NotificationsScreen** → Displays latest notifications.
- **ProfileScreen** → Shows user’s Google profile (name, picture, email).

---

## ChatListScreen
- Displays all conversations with friends (recent chats).
- Each chat item shows:
  - Profile picture (from Google).
  - Name of user.
  - Last message preview.
  - Status: `online` or `last seen`.

### Extra Features:
1. **Search Bar (Top of screen)**  
   - Search by name or email.  
   - Filters the list of conversations.  

2. **New Chat Button (FAB)**  
   - Floating Action Button at bottom right.  
   - Opens a search mode to start a new conversation.  

---

## Project Structure
```

/src
/screens
LoginScreen.js
ChatListScreen.js
ChatScreen.js
ProfileScreen.js
NotificationsScreen.js
/services
firebase.js   // Firestore setup (users + messages + presence + typing)
supabase.js   // Supabase client (upload/download/delete media)
auth.js       // Google login
/components
ChatBubble.js
MessageInput.js
AudioPlayer.js
TypingIndicator.js
NotificationItem.js
SearchBar.js
/utils
formatTime.js

````

---

## Libraries
- **Core**: Expo SDK, React Native.  
- **Auth**: `expo-auth-session`.  
- **Firebase**: `firebase` SDK (Firestore for messages, presence, typing).  
- **Supabase**: `@supabase/supabase-js` (storage for media).  
- **UI**: NativeWind (Tailwind RN) or React Native Paper.  
- **Media**: `expo-image-picker`, `expo-av`, `expo-file-system`.  
- **Icons**: `@expo/vector-icons`.  

---

## Firebase Config
```js
const firebaseConfig = {
  apiKey: "AIzaSyDA2vaD1VLrSfoFLaeN2-L6hpdDu5jDv-w",
  authDomain: "talkapp2025.firebaseapp.com",
  projectId: "talkapp2025",
  storageBucket: "talkapp2025.firebasestorage.app",
  messagingSenderId: "369761423989",
  appId: "1:369761423989:web:060d6d026b0410cdae1e3c"
};
````

---

## Supabase Config

```js
const SUPABASE_URL = "https://ggatxamblcoexalkjkvny.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FuunclexmSbFLk-73xGRuQ_ZPCM6bCD";

// Secret key (not recommended inside app, but included here since app is for personal/friends use only):
const SUPABASE_SECRET_KEY = "sb_secret_bDqoZZsXmzlxpGl2o0ro2Q_W5eO20bx";
```

* Supabase is only used for **media files**.
* Bucket: `chat-files`.

---

## Data Structure

### Firestore

* **Users Collection**

```json
{
  "id": "google_uid",
  "name": "User Name",
  "email": "user@example.com",
  "photoUrl": "https://...",
  "online": true,
  "lastSeen": 1699999999,
  "typing": false
}
```

* **Chats Collection**

  * `/chats/{chatId}/messages/{messageId}`

```json
{
  "senderId": "user1",
  "receiverId": "user2",
  "text": "Hello",
  "mediaUrl": null,
  "type": "text | image | audio | video",
  "status": "sent | delivered | seen",
  "timestamp": 1699999999
}
```

### Supabase

* **Storage (chat-files)**

  * `/images/{filename}`
  * `/audio/{filename}`
  * `/videos/{filename}`

---

## Other Notes

* App is **Android-only**.
* No **EAS Build** required.
* Dark mode + Arabic by default.
* Lightweight, optimized for Expo Go.

