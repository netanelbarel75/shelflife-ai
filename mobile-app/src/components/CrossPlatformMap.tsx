// src/components/CrossPlatformMap.tsx
import React from 'react';
import { Platform } from 'react-native';
import MapComponent from './maps/MapComponent';

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  type?: 'food-item' | 'user';
  expiryStatus?: 'fresh' | 'near-expiry' | 'expired';
}

export { MarkerData };

interface CrossPlatformMapProps {
  markers: MarkerData[];
  initialLatitude?: number;
  initialLongitude?: number;
  zoom?: number;
  onMarkerPress?: (marker: MarkerData) => void;
  style?: any;
}

const CrossPlatformMap: React.FC<CrossPlatformMapProps> = ({
  markers,
  initialLatitude = 32.0853, // Tel Aviv default
  initialLongitude = 34.7818,
  zoom = 13,
  onMarkerPress,
  style,
}) => {
  console.log(`🗺️ CrossPlatformMap loading on ${Platform.OS} with ${markers.length} markers`);

  return (
    <MapComponent
      markers={markers}
      initialLatitude={initialLatitude}
      initialLongitude={initialLongitude}
      zoom={zoom}
      onMarkerPress={onMarkerPress}
      style={style}
    />
  );
};

export default CrossPlatformMap;