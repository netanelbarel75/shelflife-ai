import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import inventoryService from '../services/inventoryService';
import { InventoryItem, InventoryStats, ItemStatus } from '../services/types';
import { Loading } from '../components';



const HomeScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [upcomingExpirations, setUpcomingExpirations] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setError(null);
      const [expiringItems, inventoryStats] = await Promise.all([
        inventoryService.getExpiringItems(7), // Get items expiring in next 7 days
        inventoryService.getInventoryStats(),
      ]);
      
      setUpcomingExpirations(expiringItems);
      setStats(inventoryStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading home screen data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case ItemStatus.EXPIRED:
        return '#FF6B6B';
      case ItemStatus.NEARING:
        return '#FFB347';
      case ItemStatus.USED:
        return '#6c757d';
      default:
        return '#51C878';
    }
  };

  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case ItemStatus.EXPIRED:
        return 'warning';
      case ItemStatus.NEARING:
        return 'time';
      case ItemStatus.USED:
        return 'checkmark-done';
      default:
        return 'checkmark-circle';
    }
  };

  const handleItemPress = (item: InventoryItem) => {
    const actions = ['Use Now', 'Share Locally', 'Mark as Used', 'Cancel'];
    
    Alert.alert(
      `${item.name}`,
      `${item.days_until_expiry !== undefined ? 
        item.days_until_expiry === 0 ? 'Expires today!' : `Expires in ${item.days_until_expiry} day(s)` : 
        'No expiry date set'}`,
      actions.map((action, index) => ({
        text: action,
        style: index === actions.length - 1 ? 'cancel' : 'default',
        onPress: async () => {
          if (action === 'Mark as Used') {
            try {
              await inventoryService.markAsUsed(item.id);
              Alert.alert('Success', `${item.name} marked as used!`);
              await loadData(); // Refresh data
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to mark item as used');
            }
          } else if (action !== 'Cancel') {
            Alert.alert('Coming Soon', `${action} feature will be available soon!`);
          }
        },
      }))
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please log in to view your food inventory</Text>
      </View>
    );
  }

  if (loading) {
    return <Loading message="Loading your food inventory..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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
      {/* Header Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total_items}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>
              {stats.expired_items}
            </Text>
            <Text style={styles.statLabel}>Expired Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#51C878' }]}>
              {stats.waste_prevented_kg}kg
            </Text>
            <Text style={styles.statLabel}>Waste Saved</Text>
          </View>
        </View>
      )}

      {/* Today's Priority Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Priority Items</Text>
        {upcomingExpirations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#51C878" />
            <Text style={styles.emptyText}>
              Great job! No items expiring soon.
            </Text>
          </View>
        ) : (
          upcomingExpirations.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                { borderLeftColor: getStatusColor(item.status) },
              ]}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.itemHeader}>
                <Ionicons
                  name={getStatusIcon(item.status)}
                  size={24}
                  color={getStatusColor(item.status)}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                </View>
                <View style={styles.expiryInfo}>
                  <Text style={[styles.daysLeft, { color: getStatusColor(item.status) }]}>
                    {item.days_until_expiry !== undefined ? 
                      item.days_until_expiry === 0 ? 'Today!' : `${item.days_until_expiry}d left` : 
                      'No date'}
                  </Text>
                  <Text style={styles.expiryDate}>
                    {item.predicted_expiry_date ? 
                      new Date(item.predicted_expiry_date).toLocaleDateString() : 
                      'No expiry date'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="camera" size={24} color="#2E8B57" />
            <Text style={styles.actionText}>Add Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="list" size={24} color="#2E8B57" />
            <Text style={styles.actionText}>View Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="storefront" size={24} color="#2E8B57" />
            <Text style={styles.actionText}>Local Market</Text>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
  expiryInfo: {
    alignItems: 'flex-end',
  },
  daysLeft: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  expiryDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    color: '#2E8B57',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    margin: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
