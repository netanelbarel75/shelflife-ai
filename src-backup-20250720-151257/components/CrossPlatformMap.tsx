// components/CrossPlatformMap.tsx - Updated with better error handling
import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Text, Dimensions } from 'react-native';
import { shadows } from '../utils/platformUtils';

// Platform-specific imports with better error handling
let MapView: any = null;
let Marker: any = null;
let MapContainer: any = null;
let TileLayer: any = null;
let LeafletMarker: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch (error) {
    console.log('react-native-maps not installed:', error);
  }
} else {
  try {
    const leaflet = require('react-leaflet');
    MapContainer = leaflet.MapContainer;
    TileLayer = leaflet.TileLayer;
    LeafletMarker = leaflet.Marker;
  } catch (error) {
    console.log('react-leaflet not installed for web:', error);
  }
}

export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  foodItem?: {
    name: string;
    expiryDate: string;
    price?: number;
    image?: string;
  };
}

interface MapProps {
  latitude: number;
  longitude: number;
  markers?: MarkerData[];
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  style?: any;
  showUserLocation?: boolean;
}

const CrossPlatformMap: React.FC<MapProps> = ({
  latitude,
  longitude,
  markers = [],
  onMarkerPress,
  onMapPress,
  style,
  showUserLocation = true,
}) => {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      if (Platform.OS === 'web') {
        // Ensure Leaflet CSS is loaded for web
        if (typeof window !== 'undefined' && !document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
          
          // Wait for CSS to load
          await new Promise((resolve) => {
            link.onload = resolve;
            setTimeout(resolve, 1000); // Fallback timeout
          });
        }
        
        // Check if Leaflet components are available
        if (MapContainer && TileLayer && LeafletMarker) {
          setMapReady(true);
        } else {
          setMapError('react-leaflet components not available');
        }
      } else {
        // Check if native map components are available
        if (MapView && Marker) {
          setMapReady(true);
        } else {
          setMapError('react-native-maps not available');
        }
      }
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError(`Map initialization failed: ${error}`);
    }
  };

  const renderFallbackMap = (message: string) => (
    <View style={[styles.fallbackContainer, style]}>
      <Text style={styles.fallbackText}>🗺️ Map Temporarily Unavailable</Text>
      <Text style={styles.fallbackSubtext}>{message}</Text>
      <View style={styles.fallbackItemsList}>
        <Text style={styles.fallbackItemsTitle}>📍 Nearby Items:</Text>
        {markers.slice(0, 3).map((marker, index) => (
          <Text key={marker.id} style={styles.fallbackItem}>
            {marker.foodItem?.image || '🍽️'} {marker.title}
          </Text>
        ))}
        {markers.length > 3 && (
          <Text style={styles.fallbackMore}>...and {markers.length - 3} more items</Text>
        )}
      </View>
    </View>
  );

  if (mapError) {
    return renderFallbackMap(mapError);
  }

  if (!mapReady) {
    return renderFallbackMap('Loading map...');
  }

  if (Platform.OS === 'web') {
    // Web implementation with react-leaflet
    try {
      return (
        <View style={[styles.mapContainer, style]}>
          <MapContainer
            center={[latitude, longitude]}
            zoom={13}
            style={styles.webMap}
            onClick={(e: any) => {
              if (onMapPress && e.latlng) {
                const { lat, lng } = e.latlng;
                onMapPress({ latitude: lat, longitude: lng });
              }
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((marker) => (
              <LeafletMarker
                key={marker.id}
                position={[marker.latitude, marker.longitude]}
                eventHandlers={{
                  click: () => onMarkerPress?.(marker.id),
                }}
              />
            ))}
          </MapContainer>
        </View>
      );
    } catch (error) {
      console.error('Web map render error:', error);
      return renderFallbackMap('Web map render failed');
    }
  } else {
    // Mobile implementation with react-native-maps
    try {
      return (
        <MapView
          style={[styles.map, style]}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={showUserLocation}
          showsMyLocationButton={false}
          onPress={(e) => {
            if (onMapPress && e.nativeEvent?.coordinate) {
              const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
              onMapPress({ latitude: lat, longitude: lng });
            }
          }}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              title={marker.title}
              description={marker.description}
              onPress={() => onMarkerPress?.(marker.id)}
            />
          ))}
        </MapView>
      );
    } catch (error) {
      console.error('Mobile map render error:', error);
      return renderFallbackMap('Mobile map render failed');
    }
  }
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 300,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.card,
  },
  map: {
    height: 300,
    width: '100%',
  },
  webMap: {
    height: '100%',
    width: '100%',
    borderRadius: 12,
  },
  fallbackContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    padding: 20,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  fallbackItemsList: {
    alignItems: 'center',
    width: '100%',
  },
  fallbackItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  fallbackItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  fallbackMore: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default CrossPlatformMap;
