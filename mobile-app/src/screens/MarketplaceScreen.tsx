// src/screens/MarketplaceScreen.tsx - Updated with functional Buy Now
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import CrossPlatformMap from '../components/CrossPlatformMap';

interface FoodItem {
  id: string;
  title: string;
  description: string;
  category: string;
  expiryDate: string;
  originalPrice: number;
  discountedPrice: number;
  latitude: number;
  longitude: number;
  distance?: number;
  sellerName: string;
  sellerContact?: string;
  expiryStatus: 'fresh' | 'near-expiry' | 'expired';
  quantity: number;
  unit: string;
  pickupLocation: string;
}

type ViewMode = 'map' | 'list';

const MarketplaceScreen: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoodItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    initializeLocation();
    loadNearbyFoodItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [foodItems, searchQuery, categoryFilter]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Enable location to find nearby food items',
          [{ text: 'OK' }]
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      console.warn('Location error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyFoodItems = async () => {
    try {
      // In a real app, this would be an API call
      // For now, using mock data with more realistic marketplace items
      const mockItems: FoodItem[] = [
        {
          id: '1',
          title: '🥬 Fresh Lettuce Pack',
          description: 'Organic lettuce, expires tomorrow',
          category: 'Vegetables',
          expiryDate: '2025-07-22',
          originalPrice: 12.90,
          discountedPrice: 6.45,
          latitude: 32.0853 + Math.random() * 0.01,
          longitude: 34.7818 + Math.random() * 0.01,
          sellerName: 'Green Market',
          sellerContact: 'contact@greenmarket.com',
          expiryStatus: 'near-expiry',
          quantity: 2,
          unit: 'packs',
          pickupLocation: 'HaYarkon St 120, Tel Aviv',
        },
        {
          id: '2',
          title: '🍞 Artisan Bread',
          description: 'Fresh baked bread, good for 2 more days',
          category: 'Bakery',
          expiryDate: '2025-07-23',
          originalPrice: 18.50,
          discountedPrice: 9.25,
          latitude: 32.0853 + Math.random() * 0.01,
          longitude: 34.7818 + Math.random() * 0.01,
          sellerName: 'Corner Bakery',
          sellerContact: 'info@cornerbakery.co.il',
          expiryStatus: 'fresh',
          quantity: 1,
          unit: 'loaf',
          pickupLocation: 'Dizengoff St 45, Tel Aviv',
        },
        {
          id: '3',
          title: '🧀 Cheese Selection',
          description: 'Mixed cheese pack, ends today',
          category: 'Dairy',
          expiryDate: '2025-07-21',
          originalPrice: 45.00,
          discountedPrice: 22.50,
          latitude: 32.0853 + Math.random() * 0.01,
          longitude: 34.7818 + Math.random() * 0.01,
          sellerName: 'Deli Plus',
          sellerContact: '052-1234567',
          expiryStatus: 'near-expiry',
          quantity: 1,
          unit: 'pack',
          pickupLocation: 'Ibn Gvirol St 78, Tel Aviv',
        },
        {
          id: '4',
          title: '🍎 Apple Bag (2kg)',
          description: 'Fresh apples, perfect for juice',
          category: 'Fruits',
          expiryDate: '2025-07-25',
          originalPrice: 24.00,
          discountedPrice: 12.00,
          latitude: 32.0853 + Math.random() * 0.01,
          longitude: 34.7818 + Math.random() * 0.01,
          sellerName: 'Fruit Paradise',
          sellerContact: 'sales@fruitparadise.com',
          expiryStatus: 'fresh',
          quantity: 1,
          unit: 'bag (2kg)',
          pickupLocation: 'Rothschild Blvd 15, Tel Aviv',
        },
      ];

      setFoodItems(mockItems);
    } catch (error) {
      console.error('Error loading marketplace items:', error);
      Alert.alert('Error', 'Failed to load marketplace items');
    }
  };

  const filterItems = () => {
    let filtered = foodItems;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Sort by expiry status and then by price
    filtered.sort((a, b) => {
      const statusOrder = { 'near-expiry': 0, 'fresh': 1, 'expired': 2 };
      const statusDiff = statusOrder[a.expiryStatus] - statusOrder[b.expiryStatus];
      if (statusDiff !== 0) return statusDiff;
      return a.discountedPrice - b.discountedPrice;
    });

    setFilteredItems(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNearbyFoodItems();
    setRefreshing(false);
  };

  const handleMarkerPress = (marker: any) => {
    const item = foodItems.find(item => item.id === marker.id);
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleBuyItem = async (item: FoodItem) => {
    Alert.alert(
      '🛒 Purchase Item',
      `Buy ${item.title} for ₪${item.discountedPrice.toFixed(2)}?\n\nPickup: ${item.pickupLocation}\nSeller: ${item.sellerName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now',
          onPress: () => processPurchase(item),
        },
      ]
    );
  };

  const processPurchase = async (item: FoodItem) => {
    try {
      // Show processing state
      Alert.alert('Processing', 'Processing your purchase...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove item from marketplace (sold)
      setFoodItems(prev => prev.filter(i => i.id !== item.id));
      
      // Show success with pickup details
      Alert.alert(
        '✅ Purchase Successful! 🎉',
        `You've successfully purchased "${item.title}" for ₪${item.discountedPrice.toFixed(2)}!\n\n📍 Pickup Location:\n${item.pickupLocation}\n\n📞 Contact Seller:\n${item.sellerContact}\n\n⏰ Please pickup before expiry date: ${item.expiryDate}`,
        [
          {
            text: 'Contact Seller',
            onPress: () => {
              Alert.alert('Contact', `Call or message ${item.sellerName} at ${item.sellerContact}`);
            },
          },
          {
            text: 'Got It!',
            style: 'default',
          },
        ]
      );
      
      setSelectedItem(null);
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert(
        'Purchase Failed',
        'Failed to complete purchase. Please try again.'
      );
    }
  };

  const handleContactSeller = (item: FoodItem) => {
    Alert.alert(
      '📞 Contact Seller',
      `Contact ${item.sellerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call/Message',
          onPress: () => {
            Alert.alert('Contact Info', `${item.sellerName}\n${item.sellerContact}\n\nYou can now contact them about "${item.title}"`);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fresh': return '#4CAF50';
      case 'near-expiry': return '#FF9800';
      case 'expired': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getUniqueCategories = () => {
    const categories = ['all', ...new Set(foodItems.map(item => item.category))];
    return categories;
  };

  const renderFoodItem = (item: FoodItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.itemCard}
      onPress={() => setSelectedItem(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.expiryStatus) }
        ]}>
          <Text style={styles.statusText}>{item.expiryStatus}</Text>
        </View>
      </View>
      
      <Text style={styles.itemDescription}>{item.description}</Text>
      <Text style={styles.itemSeller}>📍 {item.sellerName} • {item.pickupLocation}</Text>
      <Text style={styles.itemQuantity}>Quantity: {item.quantity} {item.unit}</Text>
      
      <View style={styles.priceContainer}>
        <Text style={styles.originalPrice}>₪{item.originalPrice.toFixed(2)}</Text>
        <Text style={styles.discountedPrice}>₪{item.discountedPrice.toFixed(2)}</Text>
        <Text style={styles.discount}>
          {Math.round((1 - item.discountedPrice / item.originalPrice) * 100)}% off
        </Text>
      </View>
      
      <Text style={styles.expiry}>Expires: {new Date(item.expiryDate).toLocaleDateString()}</Text>
      
      {/* Quick Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => handleContactSeller(item)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="white" />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => handleBuyItem(item)}
        >
          <Ionicons name="card-outline" size={16} color="white" />
          <Text style={styles.actionButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const mapMarkers = filteredItems.map(item => ({
    id: item.id,
    latitude: item.latitude,
    longitude: item.longitude,
    title: item.title,
    description: item.description,
    expiryStatus: item.expiryStatus,
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>🗺️ Finding nearby food items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Local Food Market</Text>
        <Text style={styles.subtitle}>{filteredItems.length} items nearby</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items, sellers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
        >
          {getUniqueCategories().map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                categoryFilter === category && styles.activeCategoryButton,
              ]}
              onPress={() => setCategoryFilter(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                categoryFilter === category && styles.activeCategoryButtonText,
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={20} color={viewMode === 'list' ? 'white' : '#666'} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons name="map" size={20} color={viewMode === 'map' ? 'white' : '#666'} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <CrossPlatformMap
            markers={mapMarkers}
            initialLatitude={location?.coords.latitude || 32.0853}
            initialLongitude={location?.coords.longitude || 34.7818}
            onMarkerPress={handleMarkerPress}
            style={styles.map}
          />
        </View>
      ) : (
        <ScrollView 
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredItems.length > 0 ? (
            filteredItems.map(renderFoodItem)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No items found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Selected Item Modal */}
      {selectedItem && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedItem.title}</Text>
            <Text style={styles.modalDescription}>{selectedItem.description}</Text>
            <Text style={styles.modalSeller}>Sold by: {selectedItem.sellerName}</Text>
            <Text style={styles.modalLocation}>📍 {selectedItem.pickupLocation}</Text>
            <Text style={styles.modalQuantity}>Quantity: {selectedItem.quantity} {selectedItem.unit}</Text>
            
            <View style={styles.modalPricing}>
              <Text style={styles.modalOriginalPrice}>
                ₪{selectedItem.originalPrice.toFixed(2)}
              </Text>
              <Text style={styles.modalDiscountedPrice}>
                ₪{selectedItem.discountedPrice.toFixed(2)}
              </Text>
              <Text style={styles.modalDiscount}>
                {Math.round((1 - selectedItem.discountedPrice / selectedItem.originalPrice) * 100)}% off
              </Text>
            </View>
            
            <Text style={styles.modalExpiry}>
              Expires: {new Date(selectedItem.expiryDate).toLocaleDateString()}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.contactButtonModal}
                onPress={() => handleContactSeller(selectedItem)}
              >
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.buyButtonModal}
                onPress={() => handleBuyItem(selectedItem)}
              >
                <Text style={styles.buyButtonText}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
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
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  categoryFilter: {
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeCategoryButtonText: {
    color: 'white',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToggle: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  activeToggleText: {
    color: 'white',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemSeller: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  discount: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: 'bold',
  },
  expiry: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  modalSeller: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  modalLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalOriginalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  modalDiscountedPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  modalDiscount: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: 'bold',
  },
  modalExpiry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 4,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  contactButtonModal: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  buyButtonModal: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 4,
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default MarketplaceScreen;