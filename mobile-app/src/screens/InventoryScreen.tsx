import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  daysLeft: number;
  status: 'fresh' | 'nearing' | 'expired';
  addedDate: string;
  source: 'receipt' | 'manual' | 'photo';
}

const InventoryScreen: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'fresh' | 'nearing' | 'expired'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchQuery, filterStatus]);

  const loadInventory = async () => {
    // Mock data - replace with API call
    const mockInventory: InventoryItem[] = [
      {
        id: '1',
        name: 'Milk (2% Low Fat)',
        category: 'Dairy',
        quantity: 1,
        unit: 'liter',
        expiryDate: '2025-07-21',
        daysLeft: 1,
        status: 'nearing',
        addedDate: '2025-07-18',
        source: 'receipt',
      },
      {
        id: '2',
        name: 'Greek Yogurt',
        category: 'Dairy',
        quantity: 2,
        unit: 'cups',
        expiryDate: '2025-07-20',
        daysLeft: 0,
        status: 'expired',
        addedDate: '2025-07-17',
        source: 'receipt',
      },
      {
        id: '3',
        name: 'Fresh Spinach',
        category: 'Vegetables',
        quantity: 1,
        unit: 'bag',
        expiryDate: '2025-07-22',
        daysLeft: 2,
        status: 'nearing',
        addedDate: '2025-07-19',
        source: 'receipt',
      },
      {
        id: '4',
        name: 'Whole Wheat Bread',
        category: 'Bakery',
        quantity: 1,
        unit: 'loaf',
        expiryDate: '2025-07-25',
        daysLeft: 5,
        status: 'fresh',
        addedDate: '2025-07-19',
        source: 'receipt',
      },
      {
        id: '5',
        name: 'Bananas',
        category: 'Fruits',
        quantity: 6,
        unit: 'pieces',
        expiryDate: '2025-07-23',
        daysLeft: 3,
        status: 'fresh',
        addedDate: '2025-07-18',
        source: 'receipt',
      },
      {
        id: '6',
        name: 'Chicken Breast',
        category: 'Meat',
        quantity: 500,
        unit: 'grams',
        expiryDate: '2025-07-22',
        daysLeft: 2,
        status: 'nearing',
        addedDate: '2025-07-19',
        source: 'receipt',
      },
    ];
    
    setInventory(mockInventory);
  };

  const filterInventory = () => {
    let filtered = inventory;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Sort by expiry date (closest first)
    filtered.sort((a, b) => a.daysLeft - b.daysLeft);

    setFilteredInventory(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return '#FF6B6B';
      case 'nearing':
        return '#FFB347';
      default:
        return '#51C878';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return 'warning';
      case 'nearing':
        return 'time';
      default:
        return 'checkmark-circle';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'Dairy': 'nutrition',
      'Vegetables': 'leaf',
      'Fruits': 'flower',
      'Meat': 'restaurant',
      'Bakery': 'cafe',
      'Pantry': 'basket',
    };
    return icons[category] || 'cube';
  };

  const handleItemPress = (item: InventoryItem) => {
    const actions = ['Mark as Used', 'Update Quantity', 'Share Locally', 'Remove', 'Cancel'];
    
    Alert.alert(
      item.name,
      `${item.quantity} ${item.unit} • Expires in ${item.daysLeft} day(s)`,
      actions.map((action, index) => ({
        text: action,
        style: index === actions.length - 1 ? 'cancel' : index === actions.length - 2 ? 'destructive' : 'default',
        onPress: () => {
          if (action !== 'Cancel') {
            Alert.alert('Action', `${action} selected for ${item.name}`);
          }
        },
      }))
    );
  };

  const getFilterCount = (status: 'all' | 'fresh' | 'nearing' | 'expired') => {
    if (status === 'all') return inventory.length;
    return inventory.filter(item => item.status === status).length;
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, { borderLeftColor: getStatusColor(item.status) }]}
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
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.unit}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons
            name={getStatusIcon(item.status)}
            size={20}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.daysLeft, { color: getStatusColor(item.status) }]}>
            {item.daysLeft === 0 ? 'Today!' : `${item.daysLeft}d`}
          </Text>
          <Text style={styles.expiryDate}>
            {new Date(item.expiryDate).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        {(['all', 'fresh', 'nearing', 'expired'] as const).map((status) => (
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
              Add receipts to start tracking your food
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#2E8B57',
    borderColor: '#2E8B57',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E8B57',
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
