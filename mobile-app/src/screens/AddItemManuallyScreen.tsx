// mobile-app/src/screens/AddItemManuallyScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddItemManuallyScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onItemAdded: (item: any) => void;
}

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

const AddItemManuallyScreen: React.FC<AddItemManuallyScreenProps> = ({
  isVisible,
  onClose,
  onItemAdded,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    quantity: '1',
    unit: 'pieces',
    storageLocation: 'fridge',
    purchaseDate: new Date(),
    expiryDate: null as Date | null,
    notes: '',
    estimatedPrice: '',
  });
  const [loading, setLoading] = useState(false);
  const [predictedExpiry, setPredictedExpiry] = useState<Date | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showStoragePicker, setShowStoragePicker] = useState(false);

  // Predict expiry date when item details change
  useEffect(() => {
    if (formData.name && formData.category) {
      predictExpiryDate();
    }
  }, [formData.name, formData.category, formData.purchaseDate]);

  const predictExpiryDate = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch('http://localhost:8000/api/inventory/predict-expiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_name: formData.name,
          category: formData.category,
          brand: formData.brand || null,
          purchase_date: formData.purchaseDate.toISOString(),
          storage_location: formData.storageLocation,
        }),
      });

      if (response.ok) {
        const prediction = await response.json();
        setPredictedExpiry(new Date(prediction.predicted_expiry_date));
        
        // Auto-set expiry date if not manually set
        if (!formData.expiryDate) {
          setFormData(prev => ({
            ...prev,
            expiryDate: new Date(prediction.predicted_expiry_date)
          }));
        }
      }
    } catch (error) {
      console.error('Failed to predict expiry:', error);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.quantity.trim() || isNaN(parseFloat(formData.quantity))) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'Please login to add items');
        return;
      }

      const itemData = {
        name: formData.name.trim(),
        category: formData.category,
        brand: formData.brand.trim() || null,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        storage_location: formData.storageLocation,
        purchase_date: formData.purchaseDate.toISOString(),
        predicted_expiry_date: formData.expiryDate?.toISOString() || null,
        notes: formData.notes.trim() || null,
        estimated_price: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : null,
        source: 'manual'
      };

      const response = await fetch('http://localhost:8000/api/inventory/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        const newItem = await response.json();
        Alert.alert(
          'Success! 🎉',
          `${formData.name} has been added to your inventory.`,
          [
            {
              text: 'Add Another',
              onPress: () => resetForm(),
            },
            {
              text: 'Done',
              onPress: () => {
                onItemAdded(newItem);
                resetForm();
                onClose();
              },
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to add item');
      }
    } catch (error) {
      console.error('Add item error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      brand: '',
      quantity: '1',
      unit: 'pieces',
      storageLocation: 'fridge',
      purchaseDate: new Date(),
      expiryDate: null,
      notes: '',
      estimatedPrice: '',
    });
    setPredictedExpiry(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryName = (id: string) => {
    const category = CATEGORIES.find(c => c.id === id);
    return category ? `${category.icon} ${category.name}` : 'Select Category';
  };

  const getStorageName = (id: string) => {
    const storage = STORAGE_LOCATIONS.find(s => s.id === id);
    return storage ? `${storage.icon} ${storage.name}` : 'Select Storage';
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Item Manually</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !formData.name.trim() || !formData.category}
            style={[
              styles.saveButton,
              (loading || !formData.name.trim() || !formData.category) && styles.saveButtonDisabled
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={[
                styles.saveButtonText,
                (loading || !formData.name.trim() || !formData.category) && styles.saveButtonTextDisabled
              ]}>
                Add Item
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Organic Bananas"
                autoFocus
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCategoryPicker(true)}
                disabled={loading}
              >
                <Text style={[styles.pickerText, !formData.category && styles.placeholderText]}>
                  {formData.category ? getCategoryName(formData.category) : 'Select Category'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Brand (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.brand}
                onChangeText={(text) => setFormData(prev => ({ ...prev, brand: text }))}
                placeholder="e.g., Dole"
                editable={!loading}
              />
            </View>
          </View>

          {/* Quantity & Storage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Quantity & Storage</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1, styles.marginRight]}>
                <Text style={styles.inputLabel}>Quantity *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                  placeholder="1"
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
              
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowUnitPicker(true)}
                  disabled={loading}
                >
                  <Text style={styles.pickerText}>{formData.unit}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Storage Location</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowStoragePicker(true)}
                disabled={loading}
              >
                <Text style={styles.pickerText}>
                  {getStorageName(formData.storageLocation)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Important Dates</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Purchase Date</Text>
              <View style={styles.dateButton}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateText}>{formatDate(formData.purchaseDate)}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Expiry Date
                {predictedExpiry && (
                  <Text style={styles.predictedLabel}> (AI Predicted)</Text>
                )}
              </Text>
              <View style={styles.dateButton}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={[
                  styles.dateText,
                  !formData.expiryDate && styles.placeholderText
                ]}>
                  {formData.expiryDate ? formatDate(formData.expiryDate) : 'AI will predict this'}
                </Text>
              </View>
              
              {predictedExpiry && (
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={() => setFormData(prev => ({ ...prev, expiryDate: predictedExpiry }))}
                  disabled={loading}
                >
                  <Text style={styles.aiButtonText}>
                    🤖 Use AI Prediction ({formatDate(predictedExpiry)})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Optional Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Additional Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estimated Price (₪)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.estimatedPrice}
                onChangeText={(text) => setFormData(prev => ({ ...prev, estimatedPrice: text }))}
                placeholder="e.g., 12.50"
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Any additional notes..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>
          </View>
        </ScrollView>

        {/* Category Picker Modal */}
        <PickerModal
          visible={showCategoryPicker}
          title="Select Category"
          options={CATEGORIES.map(cat => ({ id: cat.id, name: `${cat.icon} ${cat.name}` }))}
          selectedValue={formData.category}
          onSelect={(value) => {
            setFormData(prev => ({ ...prev, category: value }));
            setShowCategoryPicker(false);
          }}
          onClose={() => setShowCategoryPicker(false)}
        />

        {/* Unit Picker Modal */}
        <PickerModal
          visible={showUnitPicker}
          title="Select Unit"
          options={UNITS.map(unit => ({ id: unit, name: unit }))}
          selectedValue={formData.unit}
          onSelect={(value) => {
            setFormData(prev => ({ ...prev, unit: value }));
            setShowUnitPicker(false);
          }}
          onClose={() => setShowUnitPicker(false)}
        />

        {/* Storage Picker Modal */}
        <PickerModal
          visible={showStoragePicker}
          title="Select Storage Location"
          options={STORAGE_LOCATIONS.map(loc => ({ id: loc.id, name: `${loc.icon} ${loc.name}` }))}
          selectedValue={formData.storageLocation}
          onSelect={(value) => {
            setFormData(prev => ({ ...prev, storageLocation: value }));
            setShowStoragePicker(false);
          }}
          onClose={() => setShowStoragePicker(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Generic Picker Modal Component
interface PickerModalProps {
  visible: boolean;
  title: string;
  options: { id: string; name: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
  >
    <View style={styles.modalOverlay}>
      <View style={styles.pickerModal}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.pickerCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>{title}</Text>
          <View style={styles.pickerHeaderSpacer} />
        </View>
        
        <ScrollView style={styles.pickerOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.pickerOption}
              onPress={() => onSelect(option.id)}
            >
              <Text style={[
                styles.pickerOptionText,
                selectedValue === option.id && styles.pickerOptionSelected
              ]}>
                {option.name}
              </Text>
              {selectedValue === option.id && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  predictedLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '400',
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  pickerButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  aiButton: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  aiButtonText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  marginRight: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#666',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerHeaderSpacer: {
    width: 60,
  },
  pickerOptions: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});

export default AddItemManuallyScreen;
