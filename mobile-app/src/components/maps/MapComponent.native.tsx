// src/components/maps/MapComponent.native.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  expiryStatus?: 'fresh' | 'near-expiry' | 'expired';
}

interface NativeMapProps {
  markers: MarkerData[];
  initialLatitude: number;
  initialLongitude: number;
  zoom: number;
  onMarkerPress?: (marker: MarkerData) => void;
  style?: any;
}

const NativeMapComponent: React.FC<NativeMapProps> = ({
  markers,
  initialLatitude,
  initialLongitude,
  zoom,
  onMarkerPress,
  style,
}) => {
  const [hasMapView, setHasMapView] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNativeMaps();
  }, []);

  const loadNativeMaps = async () => {
    try {
      // Import react-native-maps for mobile
      const maps = require('react-native-maps');
      
      setMapComponents({
        MapView: maps.default || maps.MapView,
        Marker: maps.Marker,
      });
      
      setHasMapView(true);
      console.log('✅ Native maps loaded successfully');
    } catch (error) {
      console.warn('❌ Failed to load native maps:', error);
      setHasMapView(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getMarkerColor = (status?: string) => {
    switch (status) {
      case 'fresh': return '#4CAF50';
      case 'near-expiry': return '#FF9800';
      case 'expired': return '#F44336';
      default: return '#2196F3';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>🗺️ Loading native map...</Text>
      </View>
    );
  }

  if (!hasMapView || !MapComponents.MapView) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.title}>🗺️ Local Food Map</Text>
        <Text style={styles.subtitle}>{markers.length} items nearby</Text>
        
        <View style={styles.fallbackList}>
          {markers.map((marker) => (
            <View 
              key={marker.id} 
              style={styles.itemCard}
              onTouchEnd={() => onMarkerPress?.(marker)}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{marker.title}</Text>
                {marker.description && (
                  <Text style={styles.itemDescription}>{marker.description}</Text>
                )}
                <Text style={styles.itemLocation}>
                  📍 {marker.latitude.toFixed(3)}, {marker.longitude.toFixed(3)}
                </Text>
              </View>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: getMarkerColor(marker.expiryStatus) }
                ]} 
              />
            </View>
          ))}
        </View>
        
        <Text style={styles.note}>
          Enable location services for map view
        </Text>
      </View>
    );
  }

  const { MapView, Marker } = MapComponents;

  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude: initialLatitude,
        longitude: initialLongitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
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
          onPress={() => onMarkerPress?.(marker)}
          pinColor={getMarkerColor(marker.expiryStatus)}
        />
      ))}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'flex-start',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  fallbackList: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: '#999',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default NativeMapComponent;