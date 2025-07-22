// src/config/oauth.ts - Real Google OAuth Configuration
import { Platform } from 'react-native';

export const OAUTH_CONFIG = {
  GOOGLE_CLIENT_ID: {
    // Your actual Google Client IDs
    EXPO: '727665695899-21eqbd4s07m6hkddj71556uukabdttl5.apps.googleusercontent.com',
    ANDROID: '727665695899-04d1q5ujogrpo10td6e1m6enkmpap58e.apps.googleusercontent.com',
    IOS: '727665695899-04d1q5ujogrpo10td6e1m6enkmpap58e.apps.googleusercontent.com', // Use Android ID for now
    WEB: '727665695899-21eqbd4s07m6hkddj71556uukabdttl5.apps.googleusercontent.com', // For web platform
  },
  // Add more OAuth providers here if needed
  FACEBOOK_APP_ID: 'your-facebook-app-id',
  APPLE_CLIENT_ID: 'your-apple-client-id',
};

// Get the appropriate client ID based on platform
export const getGoogleClientId = () => {
  // Use real Google Client IDs based on platform
  if (Platform.OS === 'web') {
    return OAUTH_CONFIG.GOOGLE_CLIENT_ID.WEB;
  } else if (Platform.OS === 'ios') {
    return OAUTH_CONFIG.GOOGLE_CLIENT_ID.IOS;
  } else if (Platform.OS === 'android') {
    return OAUTH_CONFIG.GOOGLE_CLIENT_ID.ANDROID;
  } else {
    // Default to Expo for development
    return OAUTH_CONFIG.GOOGLE_CLIENT_ID.EXPO;
  }
};

// Get web client ID for backend OAuth flow
export const getWebClientId = () => {
  return OAUTH_CONFIG.GOOGLE_CLIENT_ID.WEB;
};

// Check if OAuth is configured (not demo mode)
export const isGoogleOAuthConfigured = () => {
  const clientId = getGoogleClientId();
  return clientId && clientId !== 'demo-client-id' && !clientId.includes('your-');
};

// OAuth scopes
export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'profile', 
  'email'
];
