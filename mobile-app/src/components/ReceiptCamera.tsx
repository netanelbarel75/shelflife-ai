// components/ReceiptCamera.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { shadows } from '../utils/platformUtils';

// Platform-specific imports
let Camera: any = null;
let CameraType: any = null;
let MediaLibrary: any = null;

if (Platform.OS !== 'web') {
  try {
    const expo = require('expo-camera');
    Camera = expo.Camera;
    CameraType = expo.CameraType;
    MediaLibrary = require('expo-media-library');
  } catch (error) {
    console.log('Expo Camera not installed');
  }
}

interface ReceiptCameraProps {
  onImageCaptured: (imageUri: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

const ReceiptCamera: React.FC<ReceiptCameraProps> = ({
  onImageCaptured,
  onClose,
  isVisible,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web' && Camera) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      
      if (Platform.OS === 'web') {
        // Web implementation using HTML5 file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Use rear camera on mobile browsers
        
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageUri = event.target?.result as string;
              onImageCaptured(imageUri);
            };
            reader.readAsDataURL(file);
          }
          setIsCapturing(false);
        };
        
        input.click();
        return;
      }

      // Mobile implementation with Expo Camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      setCapturedImage(photo.uri);
      
      // Save to media library (optional)
      if (MediaLibrary) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }

      onImageCaptured(photo.uri);
      
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = () => {
    if (Platform.OS === 'web') {
      // Web file upload
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            onImageCaptured(result);
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    }
  };

  if (!isVisible) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webContent}>
          <Text style={styles.title}>📄 Add Receipt</Text>
          <Text style={styles.subtitle}>
            Upload a receipt image or PDF to track your food items
          </Text>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleFileUpload}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.uploadButtonText}>📁 Choose File</Text>
                <Text style={styles.uploadButtonSubtext}>
                  Image or PDF
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isCapturing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          📷 Camera access is required to scan receipts
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={onClose}>
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!Camera) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera not available. Please install expo-camera.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={onClose}>
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={CameraType?.back || 'back'}
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
            <Text style={styles.scanText}>
              📄 Position receipt within the frame
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.capturingButton]}
              onPress={takePicture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  webContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  webContent: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%',
    ...shadows.large,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  uploadButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#4CAF50',
  },
  cornerTopRight: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#4CAF50',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#4CAF50',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#4CAF50',
  },
  scanText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 60,
  },
  controls: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingButton: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReceiptCamera;
