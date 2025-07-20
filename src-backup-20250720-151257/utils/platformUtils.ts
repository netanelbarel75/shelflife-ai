// utils/platformUtils.ts
import { Platform } from 'react-native';

interface ShadowProps {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

interface WebShadowProps {
  boxShadow?: string;
}

export const createShadow = (
  shadowColor = '#000',
  shadowOffset = { width: 0, height: 2 },
  shadowOpacity = 0.1,
  shadowRadius = 4,
  elevation = 3
): ShadowProps | WebShadowProps => {
  return Platform.select({
    web: {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px rgba(0, 0, 0, ${shadowOpacity})`,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
    },
  }) as ShadowProps | WebShadowProps;
};

// Predefined shadow styles for ShelfLife.AI
export const shadows = {
  none: {},
  small: createShadow('#000', { width: 0, height: 1 }, 0.1, 2, 2),
  medium: createShadow('#000', { width: 0, height: 2 }, 0.1, 4, 3),
  large: createShadow('#000', { width: 0, height: 4 }, 0.15, 8, 5),
  card: createShadow('#000', { width: 0, height: 2 }, 0.08, 6, 4),
};

// Platform-specific constants
export const platformConstants = {
  isWeb: Platform.OS === 'web',
  isMobile: Platform.OS !== 'web',
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
};

// Safe area constants for different platforms
export const getSafeAreaPadding = () => {
  return Platform.select({
    ios: { paddingTop: 44, paddingBottom: 34 },
    android: { paddingTop: 24, paddingBottom: 0 },
    web: { paddingTop: 0, paddingBottom: 0 },
    default: { paddingTop: 0, paddingBottom: 0 },
  });
};
