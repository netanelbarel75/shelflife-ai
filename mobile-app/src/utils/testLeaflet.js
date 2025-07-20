// Test if leaflet can be imported properly
export const testLeafletImport = () => {
  try {
    const leaflet = require('react-leaflet');
    console.log('✅ react-leaflet imported successfully');
    console.log('Available components:', Object.keys(leaflet));
    return true;
  } catch (error) {
    console.error('❌ react-leaflet import failed:', error);
    return false;
  }
};

export default testLeafletImport;
