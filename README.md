# TalkApp - WhatsApp-like Chat System

A complete WhatsApp-like messaging application built with **React Native (Expo)** featuring real-time communication, media sharing, and modern UI design.

## 🚀 Features Implemented

### Core Chat Functionality
- **Email/Password Authentication** - Firebase Auth with username system
- **Real-time Messaging** - Instant text delivery with Firestore
- **Media Support** - Images and voice messages via Supabase Storage
- **Message Status** - Sent ✅, Delivered ✅✅, Read (blue ticks)
- **Typing Indicators** - Real-time "User is typing..." display
- **Online Status** - See when users are online or last seen

### WhatsApp-like Features
- **Gifted Chat Integration** - Professional chat UI with react-native-gifted-chat@2.4.0
- **Voice Recording** - Record and send voice messages with expo-av
- **Image Sharing** - Photo selection and upload with expo-image-picker
- **Action Sheet** - Media selection menu (iOS/Android compatible)
- **Message Bubbles** - Custom styled bubbles with status indicators
- **Arabic RTL Support** - Right-to-left text alignment and Arabic locale

### Technical Implementation
- **Firebase Firestore** - Real-time message storage and synchronization
- **Supabase Storage** - Secure media file storage with public URLs
- **React Native Paper** - Material Design theming and components
- **Expo Vector Icons** - Beautiful iconography throughout the app
- **Custom Hooks** - Reusable authentication and data management

## 🛠️ Tech Stack

- **Frontend**: React Native 0.79.6 with Expo SDK 53
- **Chat UI**: react-native-gifted-chat@2.4.0 (compatible version)
- **Authentication**: Firebase Auth with email/password
- **Database**: Firebase Firestore (messages, chats, users)
- **Storage**: Supabase Storage (images, voice messages)
- **Media**: expo-image-picker, expo-av for voice recording
- **Styling**: react-native-paper + custom dark theme
- **Navigation**: React Navigation v6
- **Icons**: @expo/vector-icons

## 📱 Screens

1. **Login Screen** - Google Sign-In authentication
2. **Chat List** - All conversations with search and new chat button
3. **Chat Screen** - Individual conversation with media support
4. **Search Screen** - Find and start new conversations
5. **Profile Screen** - User profile and settings
6. **Notifications Screen** - App notifications and updates

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Google Cloud Console account (for Google Sign-In)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TalkApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Firebase Authentication with Email/Password
   - Create the following Firestore indexes:
     ```
     Collection: chats
     Fields: participants (Array), lastMessageTime (Descending)
     ```
   - Add your Firebase config to `src/config/firebase.ts`

4. **Configure Supabase**
   - Create a Supabase project at [Supabase](https://supabase.com/)
   - Create a storage bucket named `chat-media`
   - Set up storage policies for public access
   - Add your Supabase config to `src/config/supabase.ts`

6. **Start the development server**
   ```bash
   npm start
   ```

7. **Run on Android**
   ```bash
   npm run android
   ```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ChatBubble.tsx
│   ├── MessageInput.tsx
│   ├── TypingIndicator.tsx
│   └── SearchBar.tsx
├── config/             # Configuration files
│   ├── firebase.ts
│   └── supabase.ts
├── screens/            # App screens
│   ├── LoginScreen.tsx
│   ├── ChatListScreen.tsx
│   ├── ChatScreen.tsx
│   ├── SearchScreen.tsx
│   ├── ProfileScreen.tsx
│   └── NotificationsScreen.tsx
├── services/           # API and service functions
│   ├── auth.ts
│   ├── firebase.ts
│   └── supabase.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── utils/              # Utility functions
    ├── formatTime.ts
    └── nativewind.ts
```

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Firestore Database
3. Set up security rules for Firestore
4. Update the config in `src/config/firebase.ts`

### Supabase Setup
1. Create a new Supabase project
2. Create a storage bucket named `chat-files`
3. Set up storage policies
4. Update the config in `src/config/supabase.ts`

### Google Sign-In Setup
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs
4. Update the client ID in `src/services/auth.ts`

## 📱 Building for Production

### Android APK
```bash
expo build:android
```

### Android App Bundle
```bash
expo build:android --type app-bundle
```

## 🔒 Security Features

- **Secure Authentication** - Google OAuth 2.0
- **Data Encryption** - All data encrypted in transit
- **Media Security** - Secure file uploads and downloads
- **User Privacy** - No data collection beyond necessary functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🙏 Acknowledgments

- Expo team for the amazing development platform
- Firebase for real-time database services
- Supabase for secure file storage
- React Navigation for smooth navigation
- NativeWind for beautiful styling

---

**Built with ❤️ using Expo and React Native**
