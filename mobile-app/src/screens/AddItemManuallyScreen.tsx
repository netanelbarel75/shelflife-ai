// src/screens/AddItemManuallyScreen.tsx - Updated for React Navigation
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { inventoryService, InventoryItem } from '../services/InventoryService';

const CATEGORIES = [
  { id: 'fruits', name: 'Fruits', icon: '🍎' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬' },
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'meat', name: 'Meat & Fish', icon: '🥩' },
  { id: 'bakery', name: 'Bakery', icon: '🍞' },
  { id: 'pantry', name: 'Pantry', icon: '🥫' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'beverages', name: 'Beverages', icon: '🧃' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'other', name: 'Other', icon: '📦' },
];

const STORAGE_LOCATIONS = [
  { id: 'fridge', name: 'Refrigerator', icon: '❄️' },
  { id: 'freezer', name: 'Freezer', icon: '🧊' },
  { id: 'pantry', name: 'Pantry', icon: '🗄️' },
  { id: 'counter', name: 'Counter', icon: '🏠' },
];

const UNITS = ['pieces', 'kg', 'g', 'liters', 'ml', 'cups', 'tbsp', 'tsp', 'packages'];

const AddItemManuallyScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    originalName: '',
    category: 'other',
    quantity: 1,
    unit: 'pieces',
    location: 'fridge',
    purchaseDate: new Date().toISOString().split('T')[0],
    estimatedExpiryDate: '',
    price: 0,
    notes: '',
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-update expiry date when category changes
    if (field === 'category') {
      const suggestedExpiryDate = getSuggestedExpiryDate(value);
      setFormData(prev => ({ ...prev, estimatedExpiryDate: suggestedExpiryDate }));
    }
  };

  const getSuggestedExpiryDate = (category: string): string => {
    const today = new Date();
    let daysToAdd = 7; // Default

    switch (category) {
      case 'fruits':
        daysToAdd = 5;
        break;
      case 'vegetables':
        daysToAdd = 7;
        break;
      case 'dairy':
        daysToAdd = 5;
        break;
      case 'meat':
        daysToAdd = 2;
        break;
      case 'bakery':
        daysToAdd = 3;
        break;
      case 'pantry':
        daysToAdd = 365;
        break;
      case 'frozen':
        daysToAdd = 90;
        break;
      case 'beverages':
        daysToAdd = 30;
        break;
      case 'snacks':
        daysToAdd = 30;
        break;
      default:
        daysToAdd = 7;
    }

    const suggestedDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return suggestedDate.toISOString().split('T')[0];
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return false;
    }

    if (!formData.estimatedExpiryDate) {
      Alert.alert('Error', 'Please select an expiry date');
      return false;
    }

    if (new Date(formData.estimatedExpiryDate) <= new Date(formData.purchaseDate)) {
      Alert.alert('Error', 'Expiry date must be after purchase date');
      return false;
    }

    if (formData.quantity <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return false;
    }

    return true;
  };

  const handleSaveItem = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Add to inventory using the service - create a single item directly
      const success = await inventoryService.addItem({
        name: formData.name,
        originalName: formData.originalName || formData.name,
        category: formData.category as any,
        quantity: formData.quantity,
        unit: formData.unit,
        location: formData.location as any,
        estimatedExpiryDate: formData.estimatedExpiryDate,
        price: formData.price,
        notes: formData.notes,
      });

      if (!success) {
        throw new Error('Failed to add item to inventory');
      }
      
      Alert.alert(
        'Success! 🎉',
        `"${formData.name}" has been added to your inventory.`,
        [
          {
            text: 'Add Another',
            onPress: () => {
              // Reset form
              setFormData({
                name: '',
                originalName: '',
                category: 'other',
                quantity: 1,
                unit: 'pieces',
                location: 'fridge',
                purchaseDate: new Date().toISOString().split('T')[0],
                estimatedExpiryDate: '',
                price: 0,
                notes: '',
              });
            },
          },
          {
            text: 'Go to Inventory',
            onPress: () => navigation.goBack(),
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item to inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add New Item</Text>
          <Text style={styles.subtitle}>
            Add items manually with smart expiry predictions
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Item Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Item Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Bananas, Milk, Chicken breast"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

          {/* Category Selection */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    formData.category === category.id && styles.categoryButtonActive,
                  ]}
                  onPress={() => updateField('category', category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryText,
                      formData.category === category.id && styles.categoryTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity and Unit */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.flexHalf]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1"
                value={formData.quantity.toString()}
                onChangeText={(text) => updateField('quantity', parseInt(text) || 1)}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
            <View style={[styles.fieldContainer, styles.flexHalf]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert(
                      'Select Unit',
                      'Choose a unit for this item',
                      UNITS.map((unit) => ({
                        text: unit,
                        onPress: () => updateField('unit', unit),
                      }))
                    );
                  }}
                >
                  <Text style={styles.pickerText}>{formData.unit}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Storage Location */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Storage Location</Text>
            <View style={styles.locationGrid}>
              {STORAGE_LOCATIONS.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationButton,
                    formData.location === location.id && styles.locationButtonActive,
                  ]}
                  onPress={() => updateField('location', location.id)}
                >
                  <Text style={styles.locationIcon}>{location.icon}</Text>
                  <Text
                    style={[
                      styles.locationText,
                      formData.location === location.id && styles.locationTextActive,
                    ]}
                  >
                    {location.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dates */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.flexHalf]}>
              <Text style={styles.label}>Purchase Date</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                value={formData.purchaseDate}
                onChangeText={(text) => updateField('purchaseDate', text)}
                keyboardType="default"
                maxLength={10}
              />
            </View>
            <View style={[styles.fieldContainer, styles.flexHalf]}>
              <Text style={styles.label}>
                Expiry Date <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  formData.estimatedExpiryDate && styles.textInputFilled,
                ]}
                placeholder="YYYY-MM-DD"
                value={formData.estimatedExpiryDate}
                onChangeText={(text) => updateField('estimatedExpiryDate', text)}
                keyboardType="default"
                maxLength={10}
              />
              {formData.estimatedExpiryDate && (
                <Text style={styles.helperText}>
                  {Math.ceil(
                    (new Date(formData.estimatedExpiryDate).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  days from now
                </Text>
              )}
            </View>
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Price (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              value={formData.price.toString()}
              onChangeText={(text) => updateField('price', parseFloat(text) || 0)}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              placeholder="Any additional notes about this item..."
              value={formData.notes}
              onChangeText={(text) => updateField('notes', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSaveItem}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Add Item</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: 'white',
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
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
  },
  textInputFilled: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  textInputMultiline: {
    height: 80,
  },
  helperText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  locationButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  locationTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexHalf: {
    width: '48%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default AddItemManuallyScreen;
