import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../theme';

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  mapRegion: MapRegion | null;
  mapLoading: boolean;
  onRegionChangeComplete: (region: MapRegion) => void;
  onMapReady: () => void;
  onMarkerDragEnd: (event: any) => void;
};

export default function LocationMap({
  mapRegion,
  mapLoading,
  onRegionChangeComplete,
  onMapReady,
  onMarkerDragEnd,
}: Props) {
  if (mapLoading && !mapRegion) {
    return (
      <View style={[styles.map, styles.mapPlaceholder]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!mapRegion) {
    return (
      <View style={[styles.map, styles.mapPlaceholder]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      region={mapRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      onMapReady={onMapReady}
      showsUserLocation={true}
    >
      <Marker
        coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
        draggable
        onDragEnd={onMarkerDragEnd}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.greyLight,
  },
});
