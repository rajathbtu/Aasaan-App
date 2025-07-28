import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { services } from '../data/services';
import { useAuth } from '../contexts/AuthContext';

/**
 * Onboarding step for service providers to select the types of services
 * they offer.  Providers can choose up to three services.  The
 * selection is saved to the backend and used to match them with end
 * users.  Services are grouped by category for easier browsing.
 */
const SPSelectServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { updateUser } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);

  // Group services by category for rendering
  const grouped = useMemo(() => {
    const map: Record<string, typeof services> = {};
    services.forEach(s => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, []);

  const toggleService = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= 3) {
        Alert.alert('Limit reached', 'You can select up to 3 services');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      Alert.alert('Select services', 'Please choose at least one service');
      return;
    }
    try {
      await updateUser({ services: selected });
      navigation.navigate('SPSelectLocation');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save services');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.title}>Select the services you offer</Text>
      {Object.keys(grouped).map(category => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <View style={styles.servicesRow}>
            {grouped[category].map(service => {
              const isSelected = selected.includes(service.id);
              return (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                  onPress={() => toggleService(service.id)}
                >
                  <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>{service.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.button, selected.length === 0 && { opacity: 0.6 }]}
        onPress={handleContinue}
        disabled={selected.length === 0}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    marginBottom: 8,
  },
  serviceCardSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  serviceName: {
    fontSize: 14,
    color: '#1f2937',
  },
  serviceNameSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPSelectServicesScreen;