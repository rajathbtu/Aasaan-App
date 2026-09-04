import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
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

  // Missing params/location fallback so the user is never stuck on this screen.
  let guardMessage: string | null = null;
  if (!serviceId || !serviceName) guardMessage = t('createRequest.addDetails.unknownService');
  else if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng)
    guardMessage = t('createRequest.addDetails.locationRequiredTitle');

  if (guardMessage) {
    return (
      <View style={styles.screen}>
        <Header title={t('createRequest.selectTags.title')} showNotification={false} showBackButton={true} />
        <View style={styles.guardBody}>
          <View style={styles.guardIconWrap}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.guardText}>{guardMessage}</Text>
        </View>
      </View>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]));
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
    <View style={styles.screen}>
      <Header title={t('createRequest.selectTags.title')} showNotification={false} showBackButton={true} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.sectionCard, styles.cardShadow]}>
          {/* Section header with live selection count */}
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name="pricetags" size={15} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('createRequest.selectTags.tagsTitle')}</Text>
            {selectedTags.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{selectedTags.length}</Text>
              </View>
            )}
          </View>

          {service.tags && service.tags.length > 0 ? (
            <>
              <Text style={styles.tagHint}>{t('createRequest.selectTags.tagHint')}</Text>
              <View style={styles.tagsRow}>
                {service.tags.map(tag => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, selected && styles.tagChipSelected]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                      <Ionicons
                        name={selected ? 'checkmark' : 'add'}
                        size={13}
                        color={selected ? colors.primary : colors.greyMuted}
                        style={styles.tagIcon}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.noTagsRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.grey} />
              <Text style={styles.noTagsText}>{t('createRequest.selectTags.noTagsAvailable')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

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
  screen: {
    flex: 1,
    backgroundColor: colors.light,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  cardShadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  countPillText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  tagHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.grey,
    marginBottom: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.greyLight,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.dark,
  },
  tagTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  tagIcon: {
    marginLeft: spacing.xs,
  },
  noTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  noTagsText: {
    fontSize: 14,
    color: colors.grey,
    marginLeft: spacing.sm,
    textAlign: 'center',
  },
  guardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  guardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guardText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.grey,
    textAlign: 'center',
  },
});

export default WorkRequestSelectTagsScreen;
