// src/components/AuthScreens.tsx - Authentication flow manager
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { LoginScreen, RegisterScreen } from '../screens/auth/LoginScreen';
import { useAuth } from '../contexts/AuthContext';

type AuthScreen = 'login' | 'register';

const AuthScreens: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');
  const { login, googleLogin, register } = useAuth();

  const handleLoginSuccess = async (credentials: { email: string; password: string }) => {
    try {
      await login(credentials);
      // AuthContext will handle state update and navigation
      Alert.alert(
        '🎉 Welcome Back!',
        'Ready to reduce food waste?',
        [{ text: 'Let\'s Go!' }]
      );
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      Alert.alert(
        '🎉 Welcome!',
        'Ready to reduce food waste with Google?',
        [{ text: 'Let\'s Go!' }]
      );
    } catch (error: any) {
      Alert.alert('Google Login Failed', error.message);
    }
  };

  const handleRegisterSuccess = async (userData: { 
    email: string; 
    password: string; 
    username: string; 
    full_name?: string;
  }) => {
    try {
      await register(userData);
      Alert.alert(
        '🎉 Welcome to ShelfLife.AI!',
        'Your account has been created successfully. Start reducing food waste today!',
        [{ text: 'Get Started!' }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    }
  };

  const handleNavigateToRegister = () => {
    setCurrentScreen('register');
  };

  const handleNavigateToLogin = () => {
    setCurrentScreen('login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {currentScreen === 'login' ? (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onGoogleLogin={handleGoogleLogin}
          onNavigateToRegister={handleNavigateToRegister}
          onError={(error) => Alert.alert('Error', error)}
        />
      ) : (
        <RegisterScreen
          onRegisterSuccess={handleRegisterSuccess}
          onGoogleLogin={handleGoogleLogin}
          onNavigateToLogin={handleNavigateToLogin}
          onError={(error) => Alert.alert('Error', error)}
        />
      )}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🌱 Reducing food waste, one meal at a time
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default AuthScreens;