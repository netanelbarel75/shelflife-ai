// src/utils/leafletSetup.js
// Setup for Leaflet maps on web platform

let isLeafletSetup = false;

export const setupLeaflet = async () => {
  if (isLeafletSetup) {
    return true;
  }

  try {
    // Import CSS for leaflet
    if (typeof window !== 'undefined') {
      // Import leaflet CSS
      await import('leaflet/dist/leaflet.css');
      
      // Fix leaflet default marker icons
      const L = await import('leaflet');
      
      // Delete default icon
      delete L.default.Icon.Default.prototype._getIconUrl;
      
      // Set default icons
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      isLeafletSetup = true;
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to setup leaflet:', error);
    return false;
  }
};

export default setupLeaflet;