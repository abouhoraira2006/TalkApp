# Dependencies Installation Guide

## Environment Compatibility
- Node.js v18.20.8
- React Native 0.79.6
- Expo ~53.0.22

## Required Dependencies

### Core Chat Dependencies
```bash
npm install react-native-gifted-chat@2.4.0
npm install expo-image-picker@~15.0.7
npm install expo-av@~14.0.7
```

### UI & Navigation
```bash
npm install react-native-gesture-handler@~2.20.2
npm install react-native-reanimated@~3.16.1
npm install react-native-vector-icons@10.2.0
```

### Additional UI Components
```bash
npm install react-native-paper@5.12.5
npm install @react-native-community/datetimepicker@8.2.0
```

### Firebase & Supabase (Already Installed)
```bash
# Already in your project
firebase@10.13.2
@supabase/supabase-js@2.45.4
```

## Installation Commands
Run these commands in your project root:

```bash
# Install all dependencies at once
npm install react-native-gifted-chat@2.4.0 expo-image-picker@~15.0.7 expo-av@~14.0.7 react-native-gesture-handler@~2.20.2 react-native-reanimated@~3.16.1 react-native-vector-icons@10.2.0 react-native-paper@5.12.5 @react-native-community/datetimepicker@8.2.0

# For iOS (if needed)
cd ios && pod install && cd ..
```

## Expo Configuration
Add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you share them with friends.",
          "cameraPermission": "The app accesses your camera to let you take photos and share them with friends."
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "The app accesses your microphone to record voice messages."
        }
      ]
    ]
  }
}
```
