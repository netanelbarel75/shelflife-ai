// App.tsx - Updated with all new features
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import InventoryScreen from './src/screens/InventoryScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import { LoginScreen, RegisterScreen } from './src/screens/auth/LoginScreen';
import AddItemManuallyScreen from './src/screens/AddItemManuallyScreen';

// Import components
import ReceiptCamera from './src/components/ReceiptCamera';

// Import services
import { receiptProcessor } from './src/services/ReceiptProcessor';
import { inventoryService } from './src/services/InventoryService';
import { notificationService } from './src/services/NotificationService';
import { shadows, getSafeAreaPadding } from './src/utils/platformUtils';

// Types
interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  profile_image_url?: string;
  is_google_user?: boolean;
}

interface InventoryStats {
  totalItems: number;
  expiringSoon: number;
  wastePreventedThisMonth: { itemCount: number; estimatedValue: number };
}

type AuthScreen = 'login' | 'register';
type MainScreen = 'Home' | 'Inventory' | 'Marketplace' | 'Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [currentScreen, setCurrentScreen] = useState<MainScreen>('Home');
  const [showCamera, setShowCamera] = useState(false);
  const [showAddManually, setShowAddManually] = useState(false);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalItems: 0,
    expiringSoon: 0,
    wastePreventedThisMonth: { itemCount: 0, estimatedValue: 0 },
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user) {
      initializeApp();
    }
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeApp = async () => {
    try {
      // Load inventory stats
      const stats = inventoryService.getInventoryStats();
      setInventoryStats({
        totalItems: stats.totalItems,
        expiringSoon: stats.nearingExpiry + stats.expiredItems,
        wastePreventedThisMonth: stats.wastePreventedThisMonth,
      });

      // Register for push notifications
      if (user) {
        await notificationService.registerDeviceToken(user.id);
      }

      // Send welcome notification for new users
      const hasSeenWelcome = await AsyncStorage.getItem('has_seen_welcome');
      if (!hasSeenWelcome && user) {
        setTimeout(async () => {
          await notificationService.sendLocalNotification({
            title: '🍎 Welcome to ShelfLife.AI!',
            body: user.is_google_user 
              ? `Hi ${user.full_name || user.username}! Start scanning receipts to track your food and reduce waste`
              : 'Start scanning receipts to track your food and reduce waste',
            data: { type: 'welcome' },
            sound: true,
          });
          await AsyncStorage.setItem('has_seen_welcome', 'true');
        }, 2000);
      }

    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  const handleLoginSuccess = async (userData: User) => {
    try {
      setUser(userData);
      // Token should already be stored by login screen
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      
      Alert.alert(
        '🎉 Welcome!',
        `Hi ${userData.full_name || userData.username}! Ready to reduce food waste?`,
        [{ text: 'Let\'s Go!' }]
      );
    } catch (error) {
      console.error('Login success handler error:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
              setUser(null);
              setAuthScreen('login');
              setCurrentScreen('Home');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleReceiptCapture = async (imageUri: string) => {
    try {
      setShowCamera(false);
      
      // Show processing notification
      await notificationService.sendLocalNotification({
        title: '📄 Processing Receipt...',
        body: 'Analyzing your receipt and estimating expiry dates',
        data: { type: 'processing' },
        sound: false,
      });

      // Process the receipt
      const receipt = await receiptProcessor.processReceiptImage(imageUri);
      
      // Add items to inventory
      const addedItems = await inventoryService.addReceiptItems(receipt);
      
      // Update stats
      const newStats = inventoryService.getInventoryStats();
      setInventoryStats({
        totalItems: newStats.totalItems,
        expiringSoon: newStats.nearingExpiry + newStats.expiredItems,
        wastePreventedThisMonth: newStats.wastePreventedThisMonth,
      });

      // Show success notification
      await notificationService.sendLocalNotification({
        title: '✅ Receipt Processed!',
        body: `Added ${addedItems.length} items to your inventory`,
        data: { type: 'receipt_processed', itemCount: addedItems.length },
        sound: true,
      });

      // Navigate to inventory to show results
      setCurrentScreen('Inventory');

    } catch (error) {
      console.error('Receipt processing error:', error);
      await notificationService.sendLocalNotification({
        title: '❌ Processing Failed',
        body: 'Could not process receipt. Please try again.',
        data: { type: 'processing_error' },
        sound: true,
      });
    }
  };

  const handleManualItemAdded = async (item: any) => {
    try {
      // Update stats
      const newStats = inventoryService.getInventoryStats();
      setInventoryStats({
        totalItems: newStats.totalItems,
        expiringSoon: newStats.nearingExpiry + newStats.expiredItems,
        wastePreventedThisMonth: newStats.wastePreventedThisMonth,
      });

      // Show success notification
      await notificationService.sendLocalNotification({
        title: '✅ Item Added!',
        body: `${item.name} has been added to your inventory`,
        data: { type: 'manual_item_added' },
        sound: true,
      });

      // Navigate to inventory to show the new item
      setCurrentScreen('Inventory');
    } catch (error) {
      console.error('Manual item add handler error:', error);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>🌱 Loading ShelfLife.AI...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Auth Screens
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        {authScreen === 'login' ? (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setAuthScreen('register')}
          />
        ) : (
          <RegisterScreen
            onRegisterSuccess={handleLoginSuccess}
            onNavigateToLogin={() => setAuthScreen('login')}
          />
        )}
      </SafeAreaView>
    );
  }

  // Enhanced Home Screen
  const renderHomeScreen = () => (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.userGreeting}>
          <Text style={styles.greeting}>
            🌱 Good {new Date().getHours() < 12 ? 'morning' : 'evening'}!
          </Text>
          <Text style={styles.userName}>
            {user.full_name || user.username}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.tagline}>Let's reduce food waste together</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{inventoryStats.totalItems}</Text>
          <Text style={styles.statLabel}>Items Tracked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FF6B35' }]}>
            {inventoryStats.expiringSoon}
          </Text>
          <Text style={styles.statLabel}>Expiring Soon</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
            {inventoryStats.wastePreventedThisMonth.itemCount}
          </Text>
          <Text style={styles.statLabel}>Items Saved</Text>
        </View>
      </View>

      {/* Add Item Options */}
      <View style={styles.addItemSection}>
        <Text style={styles.sectionTitle}>📦 Add Items to Inventory</Text>
        
        <TouchableOpacity 
          style={styles.addReceiptButton} 
          onPress={() => setShowCamera(true)}
        >
          <Text style={styles.addReceiptIcon}>📄</Text>
          <View style={styles.addButtonContent}>
            <Text style={styles.addReceiptText}>Scan Receipt</Text>
            <Text style={styles.addReceiptSubtext}>Auto-detect items from receipt photo</Text>
          </View>
          <Text style={styles.addReceiptArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.addManualButton} 
          onPress={() => setShowAddManually(true)}
        >
          <Text style={styles.addManualIcon}>✋</Text>
          <View style={styles.addButtonContent}>
            <Text style={styles.addManualText}>Add Manually</Text>
            <Text style={styles.addManualSubtext}>Add items one by one with smart predictions</Text>
          </View>
          <Text style={styles.addManualArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setCurrentScreen('Inventory')}
        >
          <Text style={styles.actionIcon}>⏰</Text>
          <Text style={styles.actionText}>View Expiring Items</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🍽️</Text>
          <Text style={styles.actionText}>Recipe Suggestions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setCurrentScreen('Marketplace')}
        >
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionText}>Browse Local Market</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setCurrentScreen('Profile')}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>View Your Impact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Enhanced Profile Screen
  const renderProfileScreen = () => (
    <View style={styles.screen}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            <Text style={styles.profileImagePlaceholder}>
              {(user.full_name || user.username).charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.profileName}>
          {user.full_name || user.username}
        </Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        
        {user.is_google_user && (
          <View style={styles.googleBadge}>
            <Ionicons name="logo-google" size={16} color="#4285F4" />
            <Text style={styles.googleBadgeText}>Google Account</Text>
          </View>
        )}
      </View>

      <View style={styles.profileStats}>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>
            ₪{inventoryStats.wastePreventedThisMonth.estimatedValue.toFixed(0)}
          </Text>
          <Text style={styles.profileStatLabel}>Money Saved</Text>
        </View>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>
            {inventoryStats.wastePreventedThisMonth.itemCount}
          </Text>
          <Text style={styles.profileStatLabel}>Items Saved</Text>
        </View>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>
            {Math.min(5, Math.floor(inventoryStats.wastePreventedThisMonth.itemCount / 10) + 1)}
          </Text>
          <Text style={styles.profileStatLabel}>Eco Level</Text>
        </View>
      </View>

      <View style={styles.profileActions}>
        <TouchableOpacity style={styles.profileActionButton}>
          <Ionicons name="settings-outline" size={24} color="#666" />
          <Text style={styles.profileActionText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileActionButton}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.profileActionText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileActionButton}>
          <Ionicons name="help-circle-outline" size={24} color="#666" />
          <Text style={styles.profileActionText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileActionButton}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#666" />
          <Text style={styles.profileActionText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.profileActionButton, styles.logoutButtonProfile]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#FF5722" />
          <Text style={[styles.profileActionText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return renderHomeScreen();
      case 'Inventory':
        return <InventoryScreen />;
      case 'Marketplace':
        return <MarketplaceScreen />;
      case 'Profile':
        return renderProfileScreen();
      default:
        return renderHomeScreen();
    }
  };

  // Main App Navigation
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'}
        backgroundColor="#4CAF50"
      />
      
      {renderScreen()}
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'Home' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('Home')}
        >
          <Ionicons 
            name={currentScreen === 'Home' ? 'home' : 'home-outline'} 
            size={24} 
            color={currentScreen === 'Home' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.navLabel, currentScreen === 'Home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'Inventory' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('Inventory')}
        >
          <Ionicons 
            name={currentScreen === 'Inventory' ? 'cube' : 'cube-outline'} 
            size={24} 
            color={currentScreen === 'Inventory' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.navLabel, currentScreen === 'Inventory' && styles.navLabelActive]}>
            Inventory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCamera(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'Marketplace' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('Marketplace')}
        >
          <Ionicons 
            name={currentScreen === 'Marketplace' ? 'storefront' : 'storefront-outline'} 
            size={24} 
            color={currentScreen === 'Marketplace' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.navLabel, currentScreen === 'Marketplace' && styles.navLabelActive]}>
            Market
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'Profile' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('Profile')}
        >
          <Ionicons 
            name={currentScreen === 'Profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={currentScreen === 'Profile' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.navLabel, currentScreen === 'Profile' && styles.navLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Receipt Camera Modal */}
      <ReceiptCamera
        isVisible={showCamera}
        onImageCaptured={handleReceiptCapture}
        onClose={() => setShowCamera(false)}
      />

      {/* Add Item Manually Modal */}
      <AddItemManuallyScreen
        isVisible={showAddManually}
        onClose={() => setShowAddManually(false)}
        onItemAdded={handleManualItemAdded}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: getSafeAreaPadding().paddingTop,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  screen: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userGreeting: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  userName: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 4,
    ...shadows.card,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  addItemSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  addReceiptButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.medium,
  },
  addManualButton: {
    backgroundColor: '#fff3e0',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB347',
  },
  addReceiptIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  addManualIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  addButtonContent: {
    flex: 1,
  },
  addReceiptText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addManualText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addReceiptSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addManualSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addReceiptArrow: {
    fontSize: 24,
    color: '#4CAF50',
  },
  addManualArrow: {
    fontSize: 24,
    color: '#FF9800',
  },
  quickActions: {
    flex: 1,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.small,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImagePlaceholder: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  googleBadgeText: {
    fontSize: 12,
    color: '#4285F4',
    marginLeft: 6,
    fontWeight: '500',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...shadows.card,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  profileStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileActions: {
    flex: 1,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...shadows.small,
  },
  profileActionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 16,
  },
  logoutButtonProfile: {
    borderColor: '#FF5722',
    borderWidth: 1,
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: '#FF5722',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingBottom: getSafeAreaPadding().paddingBottom + 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    ...shadows.large,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  navButtonActive: {
    backgroundColor: '#f0f8f0',
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8,
    marginHorizontal: 8,
    ...shadows.medium,
  },
});

export default App;
