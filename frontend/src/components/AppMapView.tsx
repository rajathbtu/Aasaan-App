import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default MapView;
export { PROVIDER_GOOGLE };

// Re-export types so consumers can type refs/regions without importing
// react-native-maps directly (which would break the web bundle).
export type MapViewType = MapView;
export type { Region } from 'react-native-maps';
