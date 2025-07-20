// metro.config.js - Fixed for strict platform separation
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  // Enable CSS support for web
  isCSSEnabled: true,
});

// Add file extensions
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg', 'css');

// Strict platform-specific module resolution
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Better module resolution for web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Platform-specific source extensions (this is crucial)
config.resolver.sourceExts = [
  'js',
  'jsx',
  'ts', 
  'tsx',
  'json',
  'web.js',
  'web.jsx', 
  'web.ts',
  'web.tsx',
  'native.js',
  'native.jsx',
  'native.ts', 
  'native.tsx'
];

// Block react-native-maps from web builds completely
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// More aggressive blocking of native modules
if (process.env.EXPO_PUBLIC_PLATFORM === 'web') {
  config.resolver.blockList = [
    /react-native-maps/,
  ];
}

// Transformer configuration
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
  },
};

// Module map for web platform
config.resolver.alias = {
  ...(config.resolver.alias || {}),
};

// Additional web-specific settings
if (process.env.EXPO_PUBLIC_PLATFORM === 'web') {
  // Force web platform resolution
  config.resolver.platforms = ['web', 'native'];
  
  // Additional module blocking
  config.resolver.blockList = [
    ...(config.resolver.blockList || []),
    /react-native-maps.*$/,
    /.*\/react-native-maps\/.*$/,
  ];
}

module.exports = config;