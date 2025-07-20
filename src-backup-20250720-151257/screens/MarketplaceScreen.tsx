// screens/MarketplaceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import CrossPlatformMap, { MarkerData } from '../components/CrossPlatformMap';
import { shadows, getSafeAreaPadding } from '../utils/platformUtils';

interface FoodItem {
  id: string;
  name: string;
  description: string;
  expiryDate: string;
  price: number;
  currency: string;
  image?: string;
  seller: {
    id: string;
    name: string;
    rating: number;
    distance: string;
  };
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  category: 'fruits' | 'vegetables' | 'dairy' | 'bakery' | 'meat' | 'other';
  condition: 'excellent' | 'good' | 'fair';
}

const MarketplaceScreen: React.FC = () => {
  const [userLocation, setUserLocation] = useState({
    latitude: 32.0853, // Tel Aviv coordinates as default
    longitude: 34.7818,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [nearbyItems, setNearbyItems] = useState<FoodItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  const categories = [
    { id: 'all', label: 'All', emoji: '🛍️' },
    { id: 'fruits', label: 'Fruits', emoji: '🍎' },
    { id: 'vegetables', label: 'Vegetables', emoji: '🥕' },
    { id: 'dairy', label: 'Dairy', emoji: '🥛' },
    { id: 'bakery', label: 'Bakery', emoji: '🍞' },
    { id: 'meat', label: 'Meat', emoji: '🥩' },
    { id: 'other', label: 'Other', emoji: '📦' },
  ];

  // Mock data - replace with actual API calls
  const mockFoodItems: FoodItem[] = [
    {
      id: '1',
      name: 'Fresh Strawberries',
      description: 'Sweet strawberries, perfect for smoothies. Expires tomorrow!',
      expiryDate: '2025-07-21',
      price: 15,
      currency: 'ILS',
      image: '🍓',
      seller: {
        id: 'seller1',
        name: 'Sarah M.',
        rating: 4.8,
        distance: '0.3 km',
      },
      location: {
        latitude: 32.0843,
        longitude: 34.7828,
        address: 'Rothschild Blvd, Tel Aviv',
      },
      category: 'fruits',
      condition: 'excellent',
    },
    {
      id: '2',
      name: 'Whole Grain Bread',
      description: 'Artisan bread, baked yesterday. Great for toast!',
      expiryDate: '2025-07-22',
      price: 8,
      currency: 'ILS',
      image: '🍞',
      seller: {
        id: 'seller2',
        name: 'David L.',
        rating: 4.9,
        distance: '0.7 km',
      },
      location: {
        latitude: 32.0863,
        longitude: 34.7808,
        address: 'Dizengoff St, Tel Aviv',
      },
      category: 'bakery',
      condition: 'good',
    },
    {
      id: '3',
      name: 'Organic Milk',
      description: 'Fresh organic milk, expires in 2 days',
      expiryDate: '2025-07-22',
      price: 12,
      currency: 'ILS',
      image: '🥛',
      seller: {
        id: 'seller3',
        name: 'Rachel K.',
        rating: 4.7,
        distance: '1.2 km',
      },
      location: {
        latitude: 32.0833,
        longitude: 34.7838,
        address: 'King George St, Tel Aviv',
      },
      category: 'dairy',
      condition: 'excellent',
    },
  ];

  useEffect(() => {
    loadNearbyItems();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      if (Platform.OS !== 'web' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.log('Location error:', error);
          }
        );
      }
    } catch (error) {
      console.log('Geolocation not supported');
    }
  };

  const loadNearbyItems = async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNearbyItems(mockFoodItems);
    } catch (error) {
      Alert.alert('Error', 'Failed to load nearby items');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredItems = nearbyItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const mapMarkers: MarkerData[] = filteredItems.map(item => ({
    id: item.id,
    latitude: item.location.latitude,
    longitude: item.location.longitude,
    title: item.name,
    description: `₪${item.price} - Expires ${item.expiryDate}`,
    foodItem: {
      name: item.name,
      expiryDate: item.expiryDate,
      price: item.price,
      image: item.image,
    },
  }));

  const handleMarkerPress = (markerId: string) => {
    const item = nearbyItems.find(item => item.id === markerId);
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleContactSeller = (item: FoodItem) => {
    Alert.alert(
      'Contact Seller',
      `Would you like to contact ${item.seller.name} about ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => console.log('Open chat with seller') },
        { text: 'Call', onPress: () => console.log('Call seller') },
      ]
    );
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#FF9800';
      case 'fair': return '#F44336';
      default: return '#999';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadNearbyItems} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🛒 Local Food Market</Text>
          <Text style={styles.subtitle}>Discover food near you before it expires</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search for food items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Map */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>📍 Map View</Text>
          <CrossPlatformMap
            latitude={userLocation.latitude}
            longitude={userLocation.longitude}
            markers={mapMarkers}
            onMarkerPress={handleMarkerPress}
            style={styles.map}
          />
        </View>

        {/* Items List */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>
            🍽️ Available Items ({filteredItems.length})
          </Text>
          
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                🔍 No items found matching your search
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search or category filter
              </Text>
            </View>
          ) : (
            filteredItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => setSelectedItem(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemImageContainer}>
                    <Text style={styles.itemImage}>{item.image}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.itemExpiry}>
                      ⏰ {getDaysUntilExpiry(item.expiryDate)}
                    </Text>
                  </View>
                  <View style={styles.itemPricing}>
                    <Text style={styles.itemPrice}>₪{item.price}</Text>
                    <View
                      style={[
                        styles.conditionBadge,
                        { backgroundColor: getConditionColor(item.condition) },
                      ]}
                    >
                      <Text style={styles.conditionText}>
                        {item.condition}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.itemFooter}>
                  <View style={styles.sellerInfo}>
                    <Text style={styles.sellerName}>👤 {item.seller.name}</Text>
                    <Text style={styles.sellerRating}>
                      ⭐ {item.seller.rating} • 📍 {item.seller.distance}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleContactSeller(item)}
                  >
                    <Text style={styles.contactButtonText}>Contact</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Selected Item Modal */}
      {selectedItem && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedItem(null)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalItemImage}>{selectedItem.image}</Text>
              <Text style={styles.modalItemName}>{selectedItem.name}</Text>
              <Text style={styles.modalItemDescription}>
                {selectedItem.description}
              </Text>
              
              <View style={styles.modalDetails}>
                <Text style={styles.modalPrice}>₪{selectedItem.price}</Text>
                <Text style={styles.modalExpiry}>
                  {getDaysUntilExpiry(selectedItem.expiryDate)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalContactButton}
                onPress={() => {
                  handleContactSeller(selectedItem);
                  setSelectedItem(null);
                }}
              >
                <Text style={styles.modalContactButtonText}>
                  Contact {selectedItem.seller.name}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: getSafeAreaPadding().paddingTop + 20,
    backgroundColor: 'white',
    ...shadows.small,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  mapSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  map: {
    height: 250,
    borderRadius: 12,
  },
  itemsSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...shadows.small,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemImage: {
    fontSize: 30,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  itemExpiry: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sellerRating: {
    fontSize: 12,
    color: '#666',
  },
  contactButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...shadows.large,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    alignItems: 'center',
  },
  modalItemImage: {
    fontSize: 60,
    marginBottom: 16,
  },
  modalItemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalItemDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalExpiry: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '500',
  },
  modalContactButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  modalContactButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MarketplaceScreen;
