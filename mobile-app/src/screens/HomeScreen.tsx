// src/screens/HomeScreen.tsx - Updated with React Navigation and functional features
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { inventoryService, InventoryItem, InventoryStats } from '../services/InventoryService';
import { HomeScreenNavigationProp } from '../types/navigation';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [upcomingExpirations, setUpcomingExpirations] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load dashboard data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Remove loadUserData function since user data comes from AuthContext

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get inventory stats
      const inventoryStats = inventoryService.getInventoryStats();
      setStats(inventoryStats);
      
      // Get expiry alerts
      const expiryAlerts = inventoryService.getExpiryAlerts();
      
      // Convert alerts to inventory items for display
      const inventory = inventoryService.getInventory();
      const urgentItems = expiryAlerts
        .filter(alert => alert.urgency === 'high' || alert.urgency === 'expired')
        .map(alert => inventory.find(item => item.id === alert.itemId))
        .filter((item): item is InventoryItem => item !== undefined)
        .slice(0, 5); // Show top 5 urgent items
      
      setUpcomingExpirations(urgentItems);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (item: InventoryItem) => {
    const today = new Date();
    const expiryDate = new Date(item.estimatedExpiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (item.status === 'used') return '#9E9E9E';
    if (daysUntilExpiry < 0) return '#F44336'; // Expired - Red
    if (daysUntilExpiry <= 2) return '#FF9800'; // Expiring soon - Orange
    return '#4CAF50'; // Fresh - Green
  };

  const getStatusIcon = (item: InventoryItem) => {
    const today = new Date();
    const expiryDate = new Date(item.estimatedExpiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (item.status === 'used') return 'checkmark-done';
    if (daysUntilExpiry < 0) return 'warning';
    if (daysUntilExpiry <= 2) return 'time';
    return 'checkmark-circle';
  };

  const getDaysText = (item: InventoryItem) => {
    if (item.status === 'used') return 'Used';
    
    const today = new Date();
    const expiryDate = new Date(item.estimatedExpiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'Expired!';
    if (daysUntilExpiry === 0) return 'Today!';
    if (daysUntilExpiry === 1) return 'Tomorrow';
    return `${daysUntilExpiry}d left`;
  };

  const handleItemPress = async (item: InventoryItem) => {
    const actions = [];
    
    if (item.status !== 'used') {
      actions.push({
        text: '✅ Mark as Used',
        onPress: async () => {
          try {
            const success = await inventoryService.markAsUsed(item.id, 'Marked as used from home screen');
            if (success) {
              Alert.alert('Success! 🎉', `"${item.name}" marked as used`);
              await loadDashboardData(); // Refresh data
            } else {
              Alert.alert('Error', 'Failed to mark item as used');
            }
          } catch (error) {
            console.error('Error marking item as used:', error);
            Alert.alert('Error', 'Failed to mark item as used');
          }
        },
      });
    }
    
    if (item.status !== 'expired' && !item.sharedInMarketplace) {
      actions.push({
        text: '🛒 Share in Marketplace',
        onPress: async () => {
          try {
            const success = await inventoryService.shareInMarketplace(item.id);
            if (success) {
              Alert.alert('Success! 🎉', `"${item.name}" is now available in the local marketplace`);
              await loadDashboardData();
            } else {
              Alert.alert('Error', 'Failed to share item in marketplace');
            }
          } catch (error) {
            console.error('Error sharing to marketplace:', error);
            Alert.alert('Error', 'Failed to share item in marketplace');
          }
        },
      });
    }
    
    actions.push(
      {
        text: '📋 View in Inventory',
        onPress: () => navigation.navigate('Inventory'),
      },
      {
        text: 'Cancel',
        style: 'cancel' as const,
      }
    );

    Alert.alert(
      item.name,
      `${item.quantity} ${item.unit || 'units'} • ${getDaysText(item)}${item.sharedInMarketplace ? '\n🛒 Shared in marketplace' : ''}`,
      actions
    );
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add_receipt':
        navigation.navigate('ReceiptUpload');
        break;
      case 'add_manual':
        navigation.navigate('AddItemManually');
        break;
      case 'view_inventory':
        navigation.navigate('Inventory');
        break;
      case 'marketplace':
        navigation.navigate('Marketplace');
        break;
      default:
        Alert.alert('Coming Soon', 'This feature will be available soon!');
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
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userGreeting}>
          <Text style={styles.greeting}>
            🌱 Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}!
          </Text>
          <Text style={styles.userName}>
            {user?.full_name || user?.username || 'Food Saver'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.tagline}>Let's reduce food waste together</Text>

      {/* Stats Container */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Items Tracked</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>
              {stats.nearingExpiry + stats.expiredItems}
            </Text>
            <Text style={styles.statLabel}>Need Attention</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
              {stats.wastePreventedThisMonth.itemCount}
            </Text>
            <Text style={styles.statLabel}>Items Saved</Text>
          </View>
        </View>
      )}

      {/* Priority Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Priority Items</Text>
        {upcomingExpirations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.emptyText}>
              Great job! No items need immediate attention.
            </Text>
            <TouchableOpacity
              style={styles.addItemsButton}
              onPress={() => handleQuickAction('add_manual')}
            >
              <Text style={styles.addItemsButtonText}>Add items to get started</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingExpirations.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                { borderLeftColor: getStatusColor(item) },
              ]}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.itemHeader}>
                <Ionicons
                  name={getStatusIcon(item)}
                  size={24}
                  color={getStatusColor(item)}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)} • {item.quantity} {item.unit || 'units'}
                  </Text>
                  {item.sharedInMarketplace && (
                    <Text style={styles.marketplaceTag}>🛒 In marketplace</Text>
                  )}
                </View>
                <View style={styles.expiryInfo}>
                  <Text style={[styles.daysLeft, { color: getStatusColor(item) }]}>
                    {getDaysText(item)}
                  </Text>
                  <Text style={styles.expiryDate}>
                    {new Date(item.estimatedExpiryDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Add Items Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Add Items to Inventory</Text>
        
        <TouchableOpacity 
          style={styles.addReceiptButton} 
          onPress={() => handleQuickAction('add_receipt')}
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
          onPress={() => handleQuickAction('add_manual')}
        >
          <Text style={styles.addManualIcon}>✋</Text>
          <View style={styles.addButtonContent}>
            <Text style={styles.addManualText}>Add Manually</Text>
            <Text style={styles.addManualSubtext}>Add items one by one with smart predictions</Text>
          </View>
          <Text style={styles.addManualArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('view_inventory')}
          >
            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>View Inventory</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('marketplace')}
          >
            <Ionicons name="storefront-outline" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>Browse Market</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-outline" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>Your Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  userGreeting: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userName: {
    fontSize: 16,
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
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  addItemsButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addItemsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  marketplaceTag: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: 'bold',
  },
  expiryInfo: {
    alignItems: 'flex-end',
  },
  daysLeft: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  expiryDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  addReceiptButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default HomeScreen;