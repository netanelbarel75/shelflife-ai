// src/screens/InventoryScreen.tsx - Updated with functional buttons and navigation
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { inventoryService, InventoryItem } from '../services/InventoryService';

type FilterStatus = 'all' | 'fresh' | 'nearing' | 'expired';

const InventoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load inventory when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [])
  );

  useEffect(() => {
    filterInventory();
  }, [inventory, searchQuery, filterStatus]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      
      // Get all inventory items from the service
      const items = inventoryService.getInventory();
      setInventory(items);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    let filtered = inventory;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Sort by expiry date (closest first)
    filtered.sort((a, b) => {
      const aDate = new Date(a.estimatedExpiryDate);
      const bDate = new Date(b.estimatedExpiryDate);
      return aDate.getTime() - bDate.getTime();
    });

    setFilteredInventory(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
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

    if (item.status === 'used') return 'checkmark-circle';
    if (daysUntilExpiry < 0) return 'warning';
    if (daysUntilExpiry <= 2) return 'time';
    return 'checkmark-circle';
  };

  const getDaysText = (item: InventoryItem) => {
    if (item.status === 'used') return 'Used';
    
    const today = new Date();
    const expiryDate = new Date(item.estimatedExpiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)}d ago`;
    if (daysUntilExpiry === 0) return 'Expires today';
    if (daysUntilExpiry === 1) return 'Expires tomorrow';
    return `${daysUntilExpiry}d left`;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      dairy: 'nutrition',
      vegetables: 'leaf',
      fruits: 'flower',
      meat: 'restaurant',
      bakery: 'cafe',
      pantry: 'basket',
      frozen: 'snow',
      beverages: 'water',
      snacks: 'fast-food',
    };
    return icons[category.toLowerCase()] || 'cube';
  };

  const handleMarkAsUsed = async (item: InventoryItem) => {
    try {
      const success = await inventoryService.markAsUsed(item.id, 'Marked as used from inventory screen');
      
      if (success) {
        // Update local state
        setInventory(prev => prev.map(i => 
          i.id === item.id 
            ? { ...i, status: 'used' }
            : i
        ));
        
        Alert.alert('Success! 🎉', `"${item.name}" marked as used`);
      } else {
        Alert.alert('Error', 'Failed to mark item as used');
      }
    } catch (error) {
      console.error('Error marking item as used:', error);
      Alert.alert('Error', 'Failed to mark item as used');
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await inventoryService.deleteItem(item.id);
              
              if (success) {
                // Remove from local state
                setInventory(prev => prev.filter(i => i.id !== item.id));
                Alert.alert('Success', 'Item deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleShareToMarketplace = async (item: InventoryItem) => {
    if (item.status === 'expired') {
      Alert.alert('Cannot Share', 'Expired items cannot be shared in the marketplace');
      return;
    }

    try {
      const success = await inventoryService.shareInMarketplace(item.id);
      
      if (success) {
        // Update local state
        setInventory(prev => prev.map(i => 
          i.id === item.id 
            ? { ...i, sharedInMarketplace: true }
            : i
        ));
        
        Alert.alert('Success! 🎉', `"${item.name}" is now available in the local marketplace`);
      } else {
        Alert.alert('Error', 'Failed to share item in marketplace');
      }
    } catch (error) {
      console.error('Error sharing to marketplace:', error);
      Alert.alert('Error', 'Failed to share item in marketplace');
    }
  };

  const handleItemPress = (item: InventoryItem) => {
    const actions = [];
    
    if (item.status !== 'used') {
      actions.push({
        text: 'Mark as Used',
        onPress: () => handleMarkAsUsed(item),
      });
    }
    
    if (item.status !== 'expired' && !item.sharedInMarketplace) {
      actions.push({
        text: 'Share in Marketplace',
        onPress: () => handleShareToMarketplace(item),
      });
    }
    
    actions.push(
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => handleDeleteItem(item),
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

  const getFilterCount = (status: FilterStatus) => {
    if (status === 'all') return inventory.length;
    return inventory.filter(item => item.status === status).length;
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, { borderLeftColor: getStatusColor(item) }]}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>
          <Ionicons
            name={getCategoryIcon(item.category)}
            size={24}
            color="#666"
          />
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </Text>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.unit || 'units'}
          </Text>
          {item.sharedInMarketplace && (
            <Text style={styles.marketplaceTag}>🛒 In marketplace</Text>
          )}
        </View>
        <View style={styles.statusContainer}>
          <Ionicons
            name={getStatusIcon(item)}
            size={20}
            color={getStatusColor(item)}
          />
          <Text style={[styles.daysLeft, { color: getStatusColor(item) }]}>
            {getDaysText(item)}
          </Text>
          <Text style={styles.expiryDate}>
            {new Date(item.estimatedExpiryDate).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {(['all', 'fresh', 'nearing', 'expired'] as FilterStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({getFilterCount(status)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item.id}
        renderItem={renderInventoryItem}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No items match your search' : 'No items in inventory'}
            </Text>
            <Text style={styles.emptySubtext}>
              Add receipts or items manually to start tracking
            </Text>
            <TouchableOpacity
              style={styles.addFirstItemButton}
              onPress={() => (navigation as any).navigate('AddItemManually')}
            >
              <Text style={styles.addFirstItemText}>Add your first item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => (navigation as any).navigate('AddItemManually')}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
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
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
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
  itemQuantity: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  marketplaceTag: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  daysLeft: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  expiryDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstItemButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstItemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default InventoryScreen;