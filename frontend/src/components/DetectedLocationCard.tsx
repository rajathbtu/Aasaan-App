import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocation } from '../services/LocationManager';
import { colors, spacing, radius } from '../theme';

const formatCoords = (value?: number | null) =>
  typeof value === 'number' ? value.toFixed(4) : '—';

const DetectedLocationCard: React.FC = () => {
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

const styles = StyleSheet.create({
  locationPanel: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  locationHeading: {
    fontSize: 12,
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  locationValue: {
    fontSize: 13,
    color: colors.dark,
    marginBottom: 2,
  },
});

export default DetectedLocationCard;
