import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

interface ParsedItem {
  name: string;
  quantity: string;
  estimatedExpiry: string;
  category: string;
  confidence: number;
}

const ReceiptUploadScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [processingStep, setProcessingStep] = useState('');

  const requestPermissions = async () => {
    const cameraPermission = await Camera.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processReceipt(result.assets[0].uri);
    }
  };

  const selectFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant photo library permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processReceipt(result.assets[0].uri);
    }
  };

  const processReceipt = async (imageUri: string) => {
    setIsProcessing(true);
    setParsedItems([]);

    try {
      // Step 1: OCR Processing
      setProcessingStep('Reading receipt text...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Item Parsing
      setProcessingStep('Identifying food items...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Expiry Prediction
      setProcessingStep('Predicting expiry dates...');
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Mock parsed results
      const mockParsedItems: ParsedItem[] = [
        {
          name: 'Milk (2% Low Fat)',
          quantity: '1 gallon',
          estimatedExpiry: '2025-07-27',
          category: 'Dairy',
          confidence: 0.95,
        },
        {
          name: 'Bread (Whole Wheat)',
          quantity: '1 loaf',
          estimatedExpiry: '2025-07-25',
          category: 'Bakery',
          confidence: 0.88,
        },
        {
          name: 'Bananas',
          quantity: '2 lbs',
          estimatedExpiry: '2025-07-23',
          category: 'Fruits',
          confidence: 0.92,
        },
        {
          name: 'Greek Yogurt',
          quantity: '32 oz',
          estimatedExpiry: '2025-08-05',
          category: 'Dairy',
          confidence: 0.86,
        },
        {
          name: 'Fresh Spinach',
          quantity: '5 oz bag',
          estimatedExpiry: '2025-07-22',
          category: 'Vegetables',
          confidence: 0.79,
        },
      ];

      setParsedItems(mockParsedItems);
      setProcessingStep('');
    } catch (error) {
      Alert.alert('Processing Error', 'Failed to process receipt. Please try again.');
      console.error('Receipt processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndSave = async () => {
    if (parsedItems.length === 0) {
      Alert.alert('No Items', 'No items found to save.');
      return;
    }

    Alert.alert(
      'Add to Inventory',
      `Add ${parsedItems.length} items to your inventory?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add Items',
          onPress: async () => {
            // TODO: Save items to backend API
            Alert.alert(
              'Success!',
              `${parsedItems.length} items added to your inventory.`,
              [{ text: 'OK', onPress: resetForm }]
            );
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedImage(null);
    setParsedItems([]);
    setProcessingStep('');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#51C878';
    if (confidence >= 0.8) return '#FFB347';
    return '#FF6B6B';
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

  return (
    <ScrollView style={styles.container}>
      {/* Upload Options */}
      {!selectedImage && (
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>📸 Add Receipt</Text>
          <Text style={styles.sectionSubtitle}>
            Take a photo or select an existing receipt image
          </Text>

          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#2E8B57" />
              <Text style={styles.uploadButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={selectFromGallery}>
              <Ionicons name="images" size={32} color="#2E8B57" />
              <Text style={styles.uploadButtonText}>From Gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>📝 Tips for better results:</Text>
            <Text style={styles.tip}>• Ensure receipt is well-lit and flat</Text>
            <Text style={styles.tip}>• Keep text clearly visible</Text>
            <Text style={styles.tip}>• Avoid shadows and glare</Text>
            <Text style={styles.tip}>• Include the full receipt</Text>
          </View>
        </View>
      )}

      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Receipt Preview</Text>
          <Image source={{ uri: selectedImage }} style={styles.receiptPreview} />
          
          {!isProcessing && parsedItems.length === 0 && (
            <TouchableOpacity style={styles.retakeButton} onPress={resetForm}>
              <Ionicons name="camera" size={20} color="#666" />
              <Text style={styles.retakeText}>Retake Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <View style={styles.processingSection}>
          <ActivityIndicator size="large" color="#2E8B57" />
          <Text style={styles.processingText}>{processingStep}</Text>
          <View style={styles.processingSteps}>
            <View style={styles.processingStep}>
              <Ionicons 
                name={processingStep.includes('Reading') ? 'sync' : 'checkmark-circle'} 
                size={16} 
                color={processingStep.includes('Reading') ? '#2E8B57' : '#51C878'} 
              />
              <Text style={styles.stepText}>OCR Text Recognition</Text>
            </View>
            <View style={styles.processingStep}>
              <Ionicons 
                name={processingStep.includes('Identifying') ? 'sync' : processingStep.includes('Predicting') || parsedItems.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={processingStep.includes('Identifying') ? '#2E8B57' : processingStep.includes('Predicting') || parsedItems.length > 0 ? '#51C878' : '#ccc'} 
              />
              <Text style={styles.stepText}>Item Parsing</Text>
            </View>
            <View style={styles.processingStep}>
              <Ionicons 
                name={processingStep.includes('Predicting') ? 'sync' : parsedItems.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={processingStep.includes('Predicting') ? '#2E8B57' : parsedItems.length > 0 ? '#51C878' : '#ccc'} 
              />
              <Text style={styles.stepText}>Expiry Prediction</Text>
            </View>
          </View>
        </View>
      )}

      {/* Parsed Items */}
      {parsedItems.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>
            🛒 Found {parsedItems.length} Items
          </Text>
          
          {parsedItems.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Ionicons
                  name={getCategoryIcon(item.category)}
                  size={24}
                  color="#666"
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} • {item.category}
                  </Text>
                  <Text style={styles.itemExpiry}>
                    Expires: {new Date(item.estimatedExpiry).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.confidenceContainer}>
                  <View 
                    style={[
                      styles.confidenceIndicator, 
                      { backgroundColor: getConfidenceColor(item.confidence) }
                    ]} 
                  />
                  <Text style={styles.confidenceText}>
                    {Math.round(item.confidence * 100)}%
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.confirmButton} onPress={confirmAndSave}>
            <Text style={styles.confirmButtonText}>
              Add {parsedItems.length} Items to Inventory
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retryButton} onPress={resetForm}>
            <Text style={styles.retryButtonText}>Try Another Receipt</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  uploadSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#2E8B57',
    marginTop: 8,
    fontWeight: '500',
  },
  tipsContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffeeba',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  tip: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  previewSection: {
    padding: 16,
  },
  receiptPreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  retakeText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  processingSection: {
    padding: 24,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#2E8B57',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  processingSteps: {
    alignSelf: 'stretch',
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  resultsSection: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
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
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemExpiry: {
    fontSize: 12,
    color: '#2E8B57',
    marginTop: 4,
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 10,
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#2E8B57',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  retryButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default ReceiptUploadScreen;
