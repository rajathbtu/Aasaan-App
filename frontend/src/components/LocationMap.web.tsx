import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

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

export default function LocationMap({ mapLoading }: Props) {
  return (
    <View style={[styles.map, styles.mapPlaceholder]}>
      <Text style={styles.mapWebText}>{mapLoading ? 'Loading map...' : 'Map preview is unavailable on the web.'}</Text>
    </View>
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
  mapWebText: {
    color: colors.grey,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
