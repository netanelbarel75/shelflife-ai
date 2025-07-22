// src/contexts/AuthContext.tsx - Global authentication state management
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';
import { getAccessToken } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';

// Use the User interface from types
import { User } from '../services/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  googleLogin: () => Promise<void>;
  register: (userData: { email: string; password: string; username: string; full_name?: string }) => Promise<void>;
  logout: (showConfirmation?: boolean) => Promise<void>;
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  const logout = async (showConfirmation: boolean = true) => {
    console.log('🔐 Starting logout process...', { showConfirmation });
    
    const performLogout = async () => {
      try {
        console.log('🔄 Setting loading state...');
        setIsLoading(true);
        
        // Call backend logout (optional - local logout is more important)
        try {
          console.log('📡 Calling backend logout...');
          await authService.logout();
          console.log('✅ Backend logout successful');
        } catch (error) {
          console.warn('⚠️ Backend logout failed, but clearing local data anyway:', error);
        }
        
        // Clear local auth data
        console.log('🗑️ Clearing local auth data...');
        await clearAuthData();
        
        console.log('✅ User logged out successfully');
      } catch (error) {
        console.error('❌ Logout error:', error);
        // Even if anything fails, clear local data
        await clearAuthData();
      } finally {
        console.log('🔄 Clearing loading state...');
        setIsLoading(false);
        setShowLogoutModal(false); // Close modal
      }
    };

    if (showConfirmation) {
      console.log('❓ Showing logout confirmation modal...');
      setShowLogoutModal(true);
    } else {
      console.log('⚡ Performing logout without confirmation...');
      await performLogout();
    }
  };

  const handleConfirmLogout = () => {
    console.log('✅ User confirmed logout via modal');
    setShowLogoutModal(false);
    logout(false); // Call logout without confirmation since already confirmed
  };

  const handleCancelLogout = () => {
    console.log('❌ User cancelled logout via modal');
    setShowLogoutModal(false);
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
      
      {/* Custom Logout Confirmation Modal - Won't be blocked by browser */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        confirmColor="#f44336"
        icon="log-out-outline"
      />
    </AuthContext.Provider>
  );
};

export default AuthContext;