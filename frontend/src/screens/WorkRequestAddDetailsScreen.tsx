import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import * as Location from 'expo-location';

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
  const { serviceId, serviceName, serviceTags } = (route.params as any) || {};
  const service = { id: serviceId, name: serviceName, tags: (serviceTags || []) as string[] };
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { token } = useAuth();
  const { t } = useI18n();
  const [locating, setLocating] = useState(false);

  if (!serviceId || !serviceName) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('createRequest.addDetails.unknownService')}</Text>
      </View>
    );
  }

  const detectLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let displayName = '';
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (results && results.length) {
          const r = results[0] as any;
          const parts = [r.name || r.street, r.subregion || r.city || r.district].filter(Boolean);
          displayName = parts.join(', ') || r.formattedAddress || '';
        }
      } catch {}
      const locObj = { name: displayName || 'Current location', lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedLocation(locObj);
    } catch {} finally { setLocating(false); }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const handleConfirm = async () => {
    if (!selectedLocation) {
      Alert.alert(t('createRequest.addDetails.locationRequiredTitle'), t('createRequest.addDetails.locationRequiredDesc'));
      return;
    }
    if (!token) {
      Alert.alert(t('createRequest.addDetails.authRequiredTitle'), t('createRequest.addDetails.authRequiredDesc'));
      return;
    }
    try {
      const locName = selectedLocation.name || selectedLocation.description;
      const placeId = selectedLocation.place_id || selectedLocation.placeId;
      const wr: any = await API.createWorkRequest(token, {
        service: service.name,
        location: {
          name: locName,
          placeId,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        },
        tags: selectedTags,
        force: true,
      });
      navigation.navigate('WorkRequestCreated', { request: wr, locationName: locName });
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || t('createRequest.addDetails.createFailed');
      Alert.alert(t('common.error'), message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header title={t('createRequest.addDetails.headerTitle')} showNotification={true} notificationCount={3} showBackButton={true} />
      {/* Spacer to prevent overlap and add small bottom margin below header */}
      <View style={{ height: spacing.sm }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.sectionTitle}>{t('createRequest.addDetails.serviceTitle')}</Text>
          </View>
          <View style={styles.serviceCard}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="flash" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceSubtitle}>{t('createRequest.addDetails.serviceSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.editButton}>
              <Ionicons name="pencil" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.sectionTitle}>{t('createRequest.addDetails.locationTitle')}</Text>
          </View>
          <View style={styles.locationCard}>
            {locating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <ActivityIndicator size="small" />
                <Text style={{ marginLeft: spacing.sm, color: colors.grey }}>{t('common.loading') || 'Detecting current location…'}</Text>
              </View>
            )}
            <LocationSearch
              onSelect={(location) => setSelectedLocation(location)}
              initialValue={selectedLocation?.name || selectedLocation?.description || ''}
              rightActionIcon="locate-outline"
              onPressRightAction={detectLocation}
              rightActionLoading={locating}
            />
            <Text style={styles.locationNote}>
              <Ionicons name="information-circle" size={14} color={colors.grey} />
              {'  '}{t('createRequest.addDetails.locationNote')}
            </Text>
          </View>
        </View>

        {service.tags && service.tags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetags" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={styles.sectionTitle}>{t('createRequest.addDetails.tagsTitle')}</Text>
            </View>
            <Text style={styles.tagHint}>{t('createRequest.addDetails.tagHint')}</Text>
            <View style={styles.tagsRow}>
              {service.tags.map(tag => {
                const selected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity key={tag} style={[styles.tagChip, selected && styles.tagChipSelected]} onPress={() => toggleTag(tag)}>
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

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.confirmButtonText}>{t('createRequest.addDetails.confirmButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.grey} style={{ marginRight: spacing.sm }} />
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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