import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { services } from '../data/services';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Form for end users to provide details about their work request.  Users
 * specify the location where the service is needed and optionally add
 * descriptive tags.  Tags can be selected from a predefined list for
 * the chosen service or entered manually.  Upon submission the work
 * request is created via the API.
 */
const WorkRequestAddDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { serviceId } = (route.params as any) || {};
  const service = services.find(s => s.id === serviceId);
  const [locationName, setLocationName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const { token } = useAuth();

  if (!service) {
    return (
      <View style={styles.container}> 
        <Text style={styles.title}>Unknown service</Text>
      </View>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
        return [...prev, tag];
    });
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed]);
    }
    setCustomTag('');
  };

  const handleConfirm = async () => {
    const trimmedLoc = locationName.trim();
    if (!trimmedLoc) {
      Alert.alert('Location required', 'Please enter where you need the service');
      return;
    }
    if (!token) {
      Alert.alert('Not authenticated', 'Please login again');
      return;
    }
    try {
      const wr: any = await API.createWorkRequest(token, {
        service: service.name,
        location: { name: trimmedLoc, lat: 0, lng: 0 },
        tags: selectedTags,
      });
      navigation.navigate('WorkRequestCreated', { request: wr });
    } catch (err: any) {
      // Detect quota error
      const message = err?.response?.data?.message || err.message || 'Failed to create request';
      Alert.alert('Error', message);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.title}>Add work details</Text>
      <Text style={styles.label}>Service</Text>
      <View style={styles.serviceCard}>
        <Text style={styles.serviceName}>{service.name}</Text>
      </View>
      <Text style={styles.label}>Location</Text>
      <TextInput
        placeholder="Area or neighbourhood"
        style={styles.input}
        value={locationName}
        onChangeText={setLocationName}
      />
      {service.tags && service.tags.length > 0 && (
        <>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagsContainer}>
            {service.tags.map(tag => {
              const selected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      <View style={styles.customTagRow}>
        <TextInput
          placeholder="Add custom tag"
          style={styles.customInput}
          value={customTag}
          onChangeText={setCustomTag}
        />
        <TouchableOpacity style={styles.addTagButton} onPress={addCustomTag}>
          <Text style={styles.addTagText}>Add</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmText}>Confirm Request</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  serviceCard: {
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4338ca',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tagChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  tagChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tagText: {
    fontSize: 14,
    color: '#1f2937',
  },
  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addTagText: {
    fontSize: 14,
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkRequestAddDetailsScreen;