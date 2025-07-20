// src/screens/MarketplaceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
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
  expiryStatus: 'fresh' | 'near-expiry' | 'expired';
}

const MarketplaceScreen: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeLocation();
    loadNearbyFoodItems();
  }, []);

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

  const loadNearbyFoodItems = () => {
    // Mock data - in real app, this would come from your API
    const mockItems: FoodItem[] = [
      {
        id: '1',
        title: '🥬 Fresh Lettuce Pack',
        description: 'Organic lettuce, expires tomorrow',
        category: 'Vegetables',
        expiryDate: '2024-12-22',
        originalPrice: 12.90,
        discountedPrice: 6.45,
        latitude: 32.0853 + Math.random() * 0.01,
        longitude: 34.7818 + Math.random() * 0.01,
        sellerName: 'Green Market',
        expiryStatus: 'near-expiry',
      },
      {
        id: '2',
        title: '🍞 Artisan Bread',
        description: 'Fresh baked bread, good for 2 more days',
        category: 'Bakery',
        expiryDate: '2024-12-23',
        originalPrice: 18.50,
        discountedPrice: 9.25,
        latitude: 32.0853 + Math.random() * 0.01,
        longitude: 34.7818 + Math.random() * 0.01,
        sellerName: 'Corner Bakery',
        expiryStatus: 'fresh',
      },
      {
        id: '3',
        title: '🧀 Cheese Selection',
        description: 'Mixed cheese pack, ends today',
        category: 'Dairy',
        expiryDate: '2024-12-21',
        originalPrice: 45.00,
        discountedPrice: 22.50,
        latitude: 32.0853 + Math.random() * 0.01,
        longitude: 34.7818 + Math.random() * 0.01,
        sellerName: 'Deli Plus',
        expiryStatus: 'expired',
      },
      {
        id: '4',
        title: '🍎 Apple Bag (2kg)',
        description: 'Fresh apples, perfect for juice',
        category: 'Fruits',
        expiryDate: '2024-12-25',
        originalPrice: 24.00,
        discountedPrice: 12.00,
        latitude: 32.0853 + Math.random() * 0.01,
        longitude: 34.7818 + Math.random() * 0.01,
        sellerName: 'Fruit Paradise',
        expiryStatus: 'fresh',
      },
    ];

    setFoodItems(mockItems);
  };

  const handleMarkerPress = (marker: any) => {
    const item = foodItems.find(item => item.id === marker.id);
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleBuyItem = (item: FoodItem) => {
    Alert.alert(
      '🛒 Purchase Item',
      `Buy ${item.title} for ₪${item.discountedPrice.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now',
          onPress: () => {
            Alert.alert('✅ Success', 'Item purchased! Contact seller for pickup.');
            setSelectedItem(null);
          },
        },
      ]
    );
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
      <Text style={styles.itemSeller}>By {item.sellerName}</Text>
      
      <View style={styles.priceContainer}>
        <Text style={styles.originalPrice}>₪{item.originalPrice.toFixed(2)}</Text>
        <Text style={styles.discountedPrice}>₪{item.discountedPrice.toFixed(2)}</Text>
        <Text style={styles.discount}>
          {Math.round((1 - item.discountedPrice / item.originalPrice) * 100)}% off
        </Text>
      </View>
      
      <Text style={styles.expiry}>Expires: {item.expiryDate}</Text>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fresh': return '#4CAF50';
      case 'near-expiry': return '#FF9800';
      case 'expired': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const mapMarkers = foodItems.map(item => ({
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
        <Text style={styles.subtitle}>{foodItems.length} items nearby</Text>
        
        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}>
              🗺️ Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>
              📋 List
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
        <ScrollView style={styles.listContainer}>
          {foodItems.map(renderFoodItem)}
        </ScrollView>
      )}

      {/* Selected Item Modal */}
      {selectedItem && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedItem.title}</Text>
            <Text style={styles.modalDescription}>{selectedItem.description}</Text>
            <Text style={styles.modalSeller}>Sold by: {selectedItem.sellerName}</Text>
            
            <View style={styles.modalPricing}>
              <Text style={styles.modalOriginalPrice}>
                ₪{selectedItem.originalPrice.toFixed(2)}
              </Text>
              <Text style={styles.modalDiscountedPrice}>
                ₪{selectedItem.discountedPrice.toFixed(2)}
              </Text>
            </View>
            
            <Text style={styles.modalExpiry}>Expires: {selectedItem.expiryDate}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.buyButton}
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
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    padding: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
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
    marginRight: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buyButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default MarketplaceScreen;