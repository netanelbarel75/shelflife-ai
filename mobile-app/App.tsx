// App.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ReceiptCamera from './src/components/ReceiptCamera';
import { receiptProcessor } from './src/services/ReceiptProcessor';
import { inventoryService } from './src/services/InventoryService';
import { notificationService } from './src/services/NotificationService';
import { shadows, getSafeAreaPadding } from './src/utils/platformUtils';

type Screen = 'home' | 'inventory' | 'marketplace' | 'camera' | 'insights';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showCamera, setShowCamera] = useState(false);
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    expiringSoon: 0,
    wastePreventedThisMonth: { itemCount: 0, estimatedValue: 0 },
  });

  useEffect(() => {
    initializeApp();
  }, []);

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
      await notificationService.registerDeviceToken('demo-user');

      // Send welcome notification after a delay
      setTimeout(async () => {
        await notificationService.sendLocalNotification({
          title: '🍎 Welcome to ShelfLife.AI!',
          body: 'Start scanning receipts to track your food and reduce waste',
          data: { type: 'welcome' },
          sound: true,
        });
      }, 3000);

    } catch (error) {
      console.error('App initialization error:', error);
    }
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
      setCurrentScreen('inventory');

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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen stats={inventoryStats} onAddReceipt={() => setShowCamera(true)} />;
      case 'inventory':
        return <InventoryScreen />;
      case 'marketplace':
        return <MarketplaceScreen />;
      case 'insights':
        return <InsightsScreen stats={inventoryStats} />;
      default:
        return <HomeScreen stats={inventoryStats} onAddReceipt={() => setShowCamera(true)} />;
    }
  };

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
          style={[styles.navButton, currentScreen === 'home' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, currentScreen === 'home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'inventory' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('inventory')}
        >
          <Text style={styles.navIcon}>📦</Text>
          <Text style={[styles.navLabel, currentScreen === 'inventory' && styles.navLabelActive]}>
            Inventory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCamera(true)}
        >
          <Text style={styles.addButtonIcon}>📄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'marketplace' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('marketplace')}
        >
          <Text style={styles.navIcon}>🛒</Text>
          <Text style={[styles.navLabel, currentScreen === 'marketplace' && styles.navLabelActive]}>
            Market
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'insights' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('insights')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navLabel, currentScreen === 'insights' && styles.navLabelActive]}>
            Insights
          </Text>
        </TouchableOpacity>
      </View>

      {/* Receipt Camera Modal */}
      <ReceiptCamera
        isVisible={showCamera}
        onImageCaptured={handleReceiptCapture}
        onClose={() => setShowCamera(false)}
      />
    </SafeAreaView>
  );
};

// Home Screen Component
const HomeScreen: React.FC<{
  stats: any;
  onAddReceipt: () => void;
}> = ({ stats, onAddReceipt }) => (
  <View style={styles.screen}>
    <View style={styles.header}>
      <Text style={styles.greeting}>🌱 Good morning!</Text>
      <Text style={styles.tagline}>Let's reduce food waste together</Text>
    </View>

    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.totalItems}</Text>
        <Text style={styles.statLabel}>Items Tracked</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statNumber, { color: '#FF6B35' }]}>{stats.expiringSoon}</Text>
        <Text style={styles.statLabel}>Expiring Soon</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
          {stats.wastePreventedThisMonth.itemCount}
        </Text>
        <Text style={styles.statLabel}>Items Saved</Text>
      </View>
    </View>

    <TouchableOpacity style={styles.addReceiptButton} onPress={onAddReceipt}>
      <Text style={styles.addReceiptIcon}>📄</Text>
      <View>
        <Text style={styles.addReceiptText}>Add Receipt</Text>
        <Text style={styles.addReceiptSubtext}>Scan or upload to track items</Text>
      </View>
      <Text style={styles.addReceiptArrow}>→</Text>
    </TouchableOpacity>

    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionIcon}>⏰</Text>
        <Text style={styles.actionText}>View Expiring Items</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionIcon}>🍽️</Text>
        <Text style={styles.actionText}>Meal Suggestions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionIcon}>🛒</Text>
        <Text style={styles.actionText}>Browse Local Market</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Placeholder screens
const InventoryScreen: React.FC = () => (
  <View style={styles.screen}>
    <Text style={styles.screenTitle}>📦 Your Inventory</Text>
    <Text style={styles.comingSoon}>Coming soon! This will show your tracked food items with expiry dates.</Text>
  </View>
);

const InsightsScreen: React.FC<{ stats: any }> = ({ stats }) => (
  <View style={styles.screen}>
    <Text style={styles.screenTitle}>📊 Your Impact</Text>
    <Text style={styles.comingSoon}>
      This month you saved {stats.wastePreventedThisMonth.itemCount} items worth ₪
      {stats.wastePreventedThisMonth.estimatedValue.toFixed(2)}!
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: getSafeAreaPadding().paddingTop,
  },
  screen: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
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
  addReceiptButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    ...shadows.medium,
  },
  addReceiptIcon: {
    fontSize: 40,
    marginRight: 20,
  },
  addReceiptText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addReceiptSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addReceiptArrow: {
    fontSize: 24,
    color: '#4CAF50',
    marginLeft: 'auto',
  },
  quickActions: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
    ...shadows.medium,
  },
  addButtonIcon: {
    fontSize: 24,
    color: 'white',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  comingSoon: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 40,
  },
});

export default App;
