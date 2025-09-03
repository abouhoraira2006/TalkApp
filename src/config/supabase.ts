import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = "https://rizoiyxeobfgkrsyfpro.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpem9peXhlb2JmZ2tyc3lmcHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MDA5NTUsImV4cCI6MjA3MjQ3Njk1NX0.MqYBg7R5cuLGU8z-zQxFYXcGtYKnY_duBMbVj4i0Jog";

// Check if we're in development mode
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Create Supabase client with proper configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Storage bucket configuration
export const STORAGE_BUCKET = 'chat-media';
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

export default supabase;
