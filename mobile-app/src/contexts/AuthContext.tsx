// src/contexts/AuthContext.tsx - Global authentication state management
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';
import { getAccessToken } from '../services/api';

// Use the User interface from types
import { User } from '../services/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  googleLogin: () => Promise<void>;
  register: (userData: { email: string; password: string; username: string; full_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      const token = await getAccessToken();
      if (token) {
        try {
          // Verify token is still valid
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          
          // Update stored user data
          await AsyncStorage.setItem('user_data', JSON.stringify(currentUser));
        } catch (error) {
          console.log('Token validation failed, clearing auth');
          // Token is invalid, clear storage
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthData = async () => {
    setUser(null);
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
  };

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      const { user: userData } = await authService.login(credentials);
      setUser(userData);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      setIsLoading(true);
      const { user: userData } = await authService.googleLogin();
      setUser(userData);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; username: string; full_name?: string }) => {
    try {
      setIsLoading(true);
      const { user: newUser } = await authService.register(userData);
      setUser(newUser);
      await AsyncStorage.setItem('user_data', JSON.stringify(newUser));
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      await clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local data
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    googleLogin,
    register,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;