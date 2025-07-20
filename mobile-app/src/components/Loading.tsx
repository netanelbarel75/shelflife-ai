import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  size = 'large',
  color = '#007AFF',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
