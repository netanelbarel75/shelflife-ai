// src/components/LoadingScreen.tsx - Enhanced loading screen
import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  subMessage 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>🌱</Text>
        <Text style={styles.appName}>ShelfLife.AI</Text>
      </View>
      
      <ActivityIndicator size="large" color="#4CAF50" style={styles.spinner} />
      
      <Text style={styles.loadingText}>{message}</Text>
      {subMessage && (
        <Text style={styles.loadingSubtext}>{subMessage}</Text>
      )}
      
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 60,
    marginBottom: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  spinner: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginHorizontal: 4,
    opacity: 0.7,
  },
});

export default LoadingScreen;