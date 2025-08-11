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
import { Ionicons } from '@expo/vector-icons';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { services } from '../data/services';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';

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
  const { token } = useAuth();

  if (!service) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Unknown service</Text>
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
      const message = err?.response?.data?.message || err.message || 'Failed to create request';
      Alert.alert('Error', message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {/* Header */}
      <Header title="Add work details" showNotification={true} notificationCount={3} showBackButton={true} />

      {/* Service section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="briefcase" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.sectionTitle}>Service</Text>
        </View>
        <View style={styles.serviceCard}>
          <View style={styles.serviceIconContainer}>
            <Ionicons name="flash" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceSubtitle}>Selected service</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.editButton}>
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.sectionTitle}>Location</Text>
        </View>
        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder="Area or neighbourhood"
                placeholderTextColor={colors.grey}
                style={styles.locationInput}
                value={locationName}
                onChangeText={setLocationName}
              />
            </View>
            <TouchableOpacity onPress={() => setLocationName('')} style={styles.locationEditButton}>
              <Ionicons name="pencil" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.locationNote}>
            <Ionicons name="information-circle" size={14} color={colors.grey} />
            {'  '}Precise location will not be shared with service providers
          </Text>
        </View>
      </View>

      {/* Tags section */}
      {service.tags && service.tags.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetags" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.sectionTitle}>Tags</Text>
          </View>
          <Text style={styles.tagHint}>Select tags that describe your work</Text>
          <View style={styles.tagsRow}>
            {service.tags.map(tag => {
              const selected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                    {tag}
                    {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Confirm and Cancel buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.confirmButtonText}>Confirm Request</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={18} color={colors.grey} style={{ marginRight: spacing.sm }} />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
  },
  emptyText: {
    fontSize: 18,
    color: colors.dark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    right: 0,
    top: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  serviceIconContainer: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  serviceSubtitle: {
    fontSize: 12,
    color: colors.grey,
  },
  editButton: {
    padding: spacing.sm,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationInput: {
    borderBottomWidth: 0,
    fontSize: 14,
    color: colors.dark,
  },
  locationEditButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  locationNote: {
    fontSize: 12,
    color: colors.grey,
  },
  tagHint: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.greyLight,
    backgroundColor: '#fff',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 14,
    color: colors.dark,
  },
  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greyLight,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  cancelButtonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkRequestAddDetailsScreen;