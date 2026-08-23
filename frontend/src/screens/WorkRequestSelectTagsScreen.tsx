import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ImageBackground } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as realApi from '../api';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import { useI18n } from '../i18n';
import BottomCTA from '../components/BottomCTA';
import ErrorBanner from '../components/ErrorBanner';

const API = realApi;

/**
 * Screen for users to select tags for their work request.
 * Tags can be selected from a predefined list for the chosen service.
 * Upon submission the work request is created via the API.
 */
const WorkRequestSelectTagsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { serviceId, serviceName, serviceTags, selectedLocation } = (route.params as any) || {};
  const service = { id: serviceId, name: serviceName, tags: (serviceTags || []) as string[] };
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { token } = useAuth();
  const { t } = useI18n();
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [requestError, setRequestError] = useState<unknown | null>(null);

  if (!serviceId || !serviceName) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('createRequest.addDetails.unknownService')}</Text>
      </View>
    );
  }

  if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('createRequest.addDetails.locationRequiredTitle')}</Text>
      </View>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const handleConfirm = async () => {
    if (!token) {
      Alert.alert(t('createRequest.addDetails.authRequiredTitle'), t('createRequest.addDetails.authRequiredDesc'));
      return;
    }
    setRequestInProgress(true);
    try {
      const locName = selectedLocation.name || selectedLocation.description;
      const placeId = selectedLocation.place_id || selectedLocation.placeId;
      const wr: any = await API.createWorkRequest(token, {
        service: service.id,
        location: { name: locName, lat: selectedLocation.lat, lng: selectedLocation.lng, placeId },
        tags: selectedTags,
      });
      navigation.navigate('WorkRequestCreated', {
        request: { ...wr, serviceName: service.name },
        locationName: locName,
      });
      setRequestError(null);
    } catch (err: any) {
      setRequestError(err);
    } finally {
      setRequestInProgress(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title={t('createRequest.selectTags.title')} showNotification={false} showBackButton={true} />
      {/* Spacer to prevent overlap and add small bottom margin below header */}
      <View style={{ height: spacing.xs }} />

      <ImageBackground
        source={require('../../assets/bckgnd_tile.png')}
        resizeMode="repeat"
        style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>

          {service.tags && service.tags.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pricetags" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <Text style={styles.sectionTitle}>{t('createRequest.selectTags.tagsTitle')}</Text>
              </View>
              {/* <Text style={styles.tagHint}>{t('createRequest.selectTags.tagHint')}</Text> */}
              <View style={styles.tagsRow}>
                {service.tags.map(tag => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity key={tag} style={[styles.tagChip, selected && styles.tagChipSelected]} onPress={() => toggleTag(tag)}>
                      <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                        {tag}
                        {selected && <Ionicons name="checkmark" size={12} color={colors.white} />}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.noTagsText}>{t('createRequest.selectTags.noTagsAvailable')}</Text>
            </View>
          )}

        </ScrollView>
      </ImageBackground>
      <ErrorBanner error={requestError} onRetry={handleConfirm} />
      <BottomCTA
          buttonText={t('createRequest.selectTags.confirmButton')}
          onPress={handleConfirm}
          isSticky={true}
          isLoading={requestInProgress}
          isDisabled={requestInProgress}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: colors.dark,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
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
    backgroundColor: colors.white,
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
    color: colors.white,
    fontWeight: '600',
  },
  noTagsText: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});

export default WorkRequestSelectTagsScreen;
