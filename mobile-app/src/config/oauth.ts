// src/config/oauth.ts
export const OAUTH_CONFIG = {
  GOOGLE_CLIENT_ID: {
    // For development - replace with your actual Google Client ID
    EXPO: 'your-expo-client-id.apps.googleusercontent.com',
    ANDROID: 'your-android-client-id.apps.googleusercontent.com',
    IOS: 'your-ios-client-id.apps.googleusercontent.com',
  },
  // Add more OAuth providers here if needed
  FACEBOOK_APP_ID: 'your-facebook-app-id',
  APPLE_CLIENT_ID: 'your-apple-client-id',
};

// Get the appropriate client ID based on platform
export const getGoogleClientId = () => {
  // For now, return a demo client ID
  // In production, you would set up proper Google OAuth credentials
  return 'demo-client-id';
};
