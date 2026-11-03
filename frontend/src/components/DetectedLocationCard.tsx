import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocation } from '../services/LocationManager';
import { spacing, radius } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

const formatCoords = (value?: number | null) =>
  typeof value === 'number' ? value.toFixed(4) : '—';

const DetectedLocationCard: React.FC = () => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { gpsLocation, ipLocation, gpsStatus, getIPLocation } = useLocation();

  useEffect(() => {
    if (!ipLocation) {
      void getIPLocation();
    }
  }, [ipLocation, getIPLocation]);

  return (
    <View style={styles.locationPanel}>
      <Text style={styles.locationHeading}>Detected location</Text>
      <Text style={styles.locationValue}>
        GPS: {gpsLocation ? `${formatCoords(gpsLocation.latitude)}, ${formatCoords(gpsLocation.longitude)}` : gpsStatus === 'fetching' ? 'Fetching…' : 'Not available'}
      </Text>
      <Text style={styles.locationValue}>
        IP: {ipLocation ? (ipLocation.name ? `${ipLocation.name} (${formatCoords(ipLocation.latitude)}, ${formatCoords(ipLocation.longitude)})` : `${formatCoords(ipLocation.latitude)}, ${formatCoords(ipLocation.longitude)} (approx)`) : 'Approx location unavailable'}
      </Text>
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  locationPanel: {
    backgroundColor: C.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: C.greyLight,
  },
  locationHeading: {
    fontSize: 12,
    color: C.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  locationValue: {
    fontSize: 13,
    color: C.dark,
    marginBottom: 2,
  },
});

export default DetectedLocationCard;
