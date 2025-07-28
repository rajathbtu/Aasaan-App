import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { services } from '../data/services';

/**
 * Entry point for end users to create a new work request.  Displays a
 * searchable list of all available services grouped by category.  When
 * the user selects a service the flow proceeds to the details form.
 */
const WorkRequestSelectServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const map: Record<string, typeof services> = {};
    services.forEach(s => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, []);

  // Filter services based on search query (case insensitive)
  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const lower = query.trim().toLowerCase();
    const map: Record<string, typeof services> = {};
    Object.keys(grouped).forEach(cat => {
      const list = grouped[cat].filter(s => s.name.toLowerCase().includes(lower));
      if (list.length > 0) {
        map[cat] = list;
      }
    });
    return map;
  }, [query, grouped]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.title}>Select type of work</Text>
      <TextInput
        style={styles.search}
        placeholder="Search for services..."
        value={query}
        onChangeText={setQuery}
      />
      {Object.keys(filtered).map(category => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <View style={styles.servicesRow}>
            {filtered[category].map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => navigation.navigate('WorkRequestAddDetails', { serviceId: service.id })}
              >
                <Text style={styles.serviceName}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
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
  },
  search: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    color: '#1f2937',
  },
});

export default WorkRequestSelectServiceScreen;