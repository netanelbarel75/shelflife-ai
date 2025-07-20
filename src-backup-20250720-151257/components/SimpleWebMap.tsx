// components/SimpleWebMap.tsx - Leaflet-free web map alternative
import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { shadows } from '../utils/platformUtils';
import { MarkerData } from './CrossPlatformMap';

interface SimpleWebMapProps {
  latitude: number;
  longitude: number;
  markers?: MarkerData[];
  onMarkerPress?: (markerId: string) => void;
  style?: any;
}

const SimpleWebMap: React.FC<SimpleWebMapProps> = ({
  latitude,
  longitude,
  markers = [],
  onMarkerPress,
  style,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Use OpenStreetMap embed or simple grid view
      setMapLoaded(true);
    }
  }, []);

  if (Platform.OS !== 'web') {
    return null; // This component is web-only
  }

  // Simple grid-based map view without external dependencies
  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>📍 Map View - {markers.length} items nearby</Text>
        <Text style={styles.coordinates}>
          📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
      </View>
      
      <View style={styles.mapGrid}>
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&marker=${latitude},${longitude}`}
          style={{
            width: '100%',
            height: '200px',
            border: 'none',
            borderRadius: '8px',
          }}
          title="Location Map"
        />
      </View>

      <View style={styles.markersList}>
        {markers.map((marker, index) => (
          <View
            key={marker.id}
            style={[
              styles.markerItem,
              { backgroundColor: getMarkerColor(index) }
            ]}
            onTouchStart={() => onMarkerPress?.(marker.id)}
          >
            <Text style={styles.markerEmoji}>
              {marker.foodItem?.image || '🍽️'}
            </Text>
            <View style={styles.markerInfo}>
              <Text style={styles.markerTitle}>{marker.title}</Text>
              <Text style={styles.markerDescription} numberOfLines={1}>
                {marker.description}
              </Text>
            </View>
            <Text style={styles.markerDistance}>
              {calculateDistance(latitude, longitude, marker.latitude, marker.longitude)}km
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const getMarkerColor = (index: number): string => {
  const colors = ['#e8f5e8', '#fff3e0', '#e3f2fd', '#fce4ec', '#f3e5f5'];
  return colors[index % colors.length];
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance.toFixed(1);
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.card,
  },
  mapHeader: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 12,
    color: '#666',
  },
  mapGrid: {
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  markersList: {
    maxHeight: 200,
    backgroundColor: 'white',
  },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  markerEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  markerInfo: {
    flex: 1,
    marginRight: 8,
  },
  markerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  markerDescription: {
    fontSize: 12,
    color: '#666',
  },
  markerDistance: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

export default SimpleWebMap;
