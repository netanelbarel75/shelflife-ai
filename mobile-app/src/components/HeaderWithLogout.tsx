// src/components/HeaderWithLogout.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface HeaderWithLogoutProps {
  title?: string;
  showLogout?: boolean;
  backgroundColor?: string;
  titleColor?: string;
}

const HeaderWithLogout: React.FC<HeaderWithLogoutProps> = ({ 
  title = 'ShelfLife.AI',
  showLogout = true,
  backgroundColor = '#4CAF50',
  titleColor = '#fff'
}) => {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout(true); // Show confirmation
    } catch (error: any) {
      console.error('Header logout error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor }]}>
        <View style={styles.leftSection}>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        </View>
        
        {showLogout && user && (
          <View style={styles.rightSection}>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={24} color={titleColor} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// Quick Logout Button Component (for any screen)
export const QuickLogoutButton: React.FC<{
  style?: any;
  size?: number;
  color?: string;
}> = ({ style, size = 24, color = '#f44336' }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout(true);
    } catch (error: any) {
      console.error('Quick logout error:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.quickLogout, style]}
      onPress={handleLogout}
      activeOpacity={0.7}
    >
      <Ionicons name="log-out-outline" size={size} color={color} />
    </TouchableOpacity>
  );
};

// Emergency Logout (no confirmation) - for debugging
export const EmergencyLogoutButton: React.FC<{ style?: any }> = ({ style }) => {
  const { logout } = useAuth();

  const handleEmergencyLogout = async () => {
    try {
      await logout(false); // No confirmation
    } catch (error: any) {
      console.error('Emergency logout error:', error);
    }
  };

  if (!__DEV__) return null; // Only show in development

  return (
    <TouchableOpacity
      style={[styles.emergencyLogout, style]}
      onPress={handleEmergencyLogout}
      activeOpacity={0.7}
    >
      <Ionicons name="warning" size={20} color="#fff" />
      <Text style={styles.emergencyText}>Emergency Logout</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickLogout: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244,67,54,0.1)',
  },
  emergencyLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default HeaderWithLogout;