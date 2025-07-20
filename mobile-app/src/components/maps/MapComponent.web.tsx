// src/components/maps/MapComponent.web.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  expiryStatus?: 'fresh' | 'near-expiry' | 'expired';
}

interface WebMapProps {
  markers: MarkerData[];
  initialLatitude: number;
  initialLongitude: number;
  zoom: number;
  onMarkerPress?: (marker: MarkerData) => void;
  style?: any;
}

const WebMapComponent: React.FC<WebMapProps> = ({
  markers,
  initialLatitude,
  initialLongitude,
  zoom,
  onMarkerPress,
  style,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [leafletMap, setLeafletMap] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    initializeLeafletMap();
  }, []);

  useEffect(() => {
    if (leafletMap && markers.length > 0) {
      updateMapMarkers();
    }
  }, [markers, leafletMap]);

  const initializeLeafletMap = async () => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window not available');
      }

      // Load leaflet CSS first
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);

      // Wait for CSS to load
      await new Promise((resolve) => {
        cssLink.onload = resolve;
        setTimeout(resolve, 1000); // fallback timeout
      });

      // Load leaflet JS
      const leafletScript = document.createElement('script');
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(leafletScript);

      leafletScript.onload = () => {
        setTimeout(() => {
          createMap();
        }, 100);
      };

      leafletScript.onerror = () => {
        throw new Error('Failed to load Leaflet');
      };

    } catch (error) {
      console.warn('❌ Failed to initialize leaflet:', error);
      setError(error.message);
      setIsMapReady(false);
    }
  };

  const createMap = () => {
    try {
      if (!mapRef.current || !window.L) {
        throw new Error('Map container or Leaflet not ready');
      }

      // Create map
      const map = window.L.map(mapRef.current).setView([initialLatitude, initialLongitude], zoom);

      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      // Fix default markers
      delete window.L.Icon.Default.prototype._getIconUrl;
      window.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      setLeafletMap(map);
      setIsMapReady(true);
      console.log('✅ Leaflet map created successfully');

    } catch (error) {
      console.error('❌ Failed to create map:', error);
      setError(error.message);
      setIsMapReady(false);
    }
  };

  const updateMapMarkers = () => {
    if (!leafletMap || !window.L) return;

    // Clear existing markers
    leafletMap.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker) {
        leafletMap.removeLayer(layer);
      }
    });

    // Add new markers
    markers.forEach((marker) => {
      const markerColor = getMarkerColor(marker.expiryStatus);
      
      // Create custom icon with color
      const customIcon = window.L.divIcon({
        html: `<div style="
          background-color: ${markerColor};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">📍</div>`,
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const leafletMarker = window.L.marker([marker.latitude, marker.longitude], {
        icon: customIcon
      }).addTo(leafletMap);

      // Add popup
      const popupContent = `
        <div style="text-align: center; min-width: 150px;">
          <strong style="font-size: 14px; color: #333;">${marker.title}</strong>
          ${marker.description ? `<p style="font-size: 12px; color: #666; margin: 5px 0;">${marker.description}</p>` : ''}
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${markerColor};
            margin: 5px auto;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          "></div>
          <small style="font-size: 10px; color: #999;">
            ${marker.expiryStatus?.replace('-', ' ') || 'unknown'}
          </small>
        </div>
      `;

      leafletMarker.bindPopup(popupContent);

      // Add click handler
      leafletMarker.on('click', () => {
        onMarkerPress?.(marker);
      });
    });

    console.log(`✅ Added ${markers.length} markers to map`);
  };

  const getMarkerColor = (status?: string) => {
    switch (status) {
      case 'fresh': return '#4CAF50';
      case 'near-expiry': return '#FF9800';
      case 'expired': return '#F44336';
      default: return '#2196F3';
    }
  };

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.title}>🗺️ Local Food Map</Text>
        <Text style={styles.subtitle}>{markers.length} items nearby</Text>
        
        <View style={styles.fallbackList}>
          {markers.map((marker) => (
            <div 
              key={marker.id} 
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
              onClick={() => onMarkerPress?.(marker)}
            >
              <div style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{marker.title}</Text>
                {marker.description && (
                  <Text style={styles.itemDescription}>{marker.description}</Text>
                )}
                <Text style={styles.itemLocation}>
                  📍 {marker.latitude.toFixed(3)}, {marker.longitude.toFixed(3)}
                </Text>
              </div>
              <div 
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '6px',
                  backgroundColor: getMarkerColor(marker.expiryStatus),
                  marginLeft: '12px'
                }}
              />
            </div>
          ))}
        </View>
        
        <Text style={styles.note}>
          Map temporarily unavailable - showing list view
        </Text>
      </View>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', ...style }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          backgroundColor: '#f0f8ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {!isMapReady && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '18px'
          }}>
            🗺️ Loading interactive map...
          </div>
        )}
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
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
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

// Add global type for Leaflet
declare global {
  interface Window {
    L: any;
  }
}

export default WebMapComponent;