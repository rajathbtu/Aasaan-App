import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import LocationSearch from '../components/LocationSearch';

/**
 * Final onboarding step for service providers.  Providers specify the
 * general location where they operate and the radius (in kilometres)
 * within which they want to receive work requests.  Location is stored
 * as a plain string; latitude/longitude would normally be captured via
 * geolocation or a map picker.
 */
const SPSelectLocationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { updateUser } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [radius, setRadius] = useState<number>(5);

  const handleSave = async () => {
    if (!selectedLocation) {
      Alert.alert('Required', 'Please select a location');
      return;
    }
    try {
      await updateUser({
        location: {
          name: selectedLocation.description,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        } as any,
        radius,
      });
      navigation.navigate('Main');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save location');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where do you work?</Text>
      <LocationSearch onSelect={(location) => setSelectedLocation(location)} />
      <Text style={styles.subtitle}>Select radius (km)</Text>
      <View style={styles.radiusRow}>
        {[3, 5, 10, 15].map(value => (
          <TouchableOpacity
            key={value}
            style={[styles.radiusButton, radius === value && styles.radiusButtonSelected]}
            onPress={() => setRadius(value)}
          >
            <Text style={[styles.radiusText, radius === value && styles.radiusTextSelected]}>{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#1f2937',
  },
  radiusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  radiusButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  radiusText: {
    fontSize: 16,
    color: '#1f2937',
  },
  radiusTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPSelectLocationScreen;