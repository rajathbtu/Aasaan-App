import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createWorkRequest } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import { useI18n } from '../i18n';
import BottomCTA from '../components/BottomCTA';
import ErrorBanner from '../components/ErrorBanner';

const REQUEST_TITLE_MAX_LENGTH = 80;

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
  const tagsPerRow = Math.ceil(service.tags.length / 3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [requestTitle, setRequestTitle] = useState('');
  const [titleLimitReached, setTitleLimitReached] = useState(false);
  const [phoneConsent, setPhoneConsent] = useState(false);
  const { token } = useAuth();
  const { t } = useI18n();
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const titleCharacterCount = Array.from(requestTitle).length;
  const showTitleCount = REQUEST_TITLE_MAX_LENGTH - titleCharacterCount < 20;

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

  const handleTitleChange = (value: string) => {
    if (Array.from(value).length > REQUEST_TITLE_MAX_LENGTH) {
      setTitleLimitReached(true);
      return;
    }
    setRequestTitle(value);
    setTitleLimitReached(false);
  };

  const handleEditLocation = () => {
    navigation.navigate('LocationSelect', {
      mode: 'requestcreation',
      serviceId,
      serviceName,
      serviceTags,
      selectedLocation,
      returnToTagsRouteKey: route.key,
    });
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
      const wr: any = await createWorkRequest(token, {
        service: service.id,
        title: requestTitle.trim() || undefined,
        location: { name: locName, lat: selectedLocation.lat, lng: selectedLocation.lng, placeId },
        tags: selectedTags,
        phoneConsent,
      });
      
      navigation.navigate('WorkRequestCreated', {
        request: wr,
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
      <Header title={ serviceName || t('createRequest.selectTags.title')} 
        subheader={t('createRequest.selectTags.headerSubTitle')}
        showNotification={false} showBackButton={true} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleField}>
            <View style={styles.titleLabelRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="document-text-outline" size={15} color={colors.primary} />
              </View>
              <Text style={styles.label}>{t('createRequest.selectTags.requestTitleLabel')}</Text>
            </View>
            <Text style={styles.titleHint}>
              {t('createRequest.selectTags.requestTitleHint', { max: REQUEST_TITLE_MAX_LENGTH })}
            </Text>
            <View style={styles.titleInputContainer}>
              <TextInput
                style={[styles.titleInput, showTitleCount && styles.titleInputWithCount]}
                value={requestTitle}
                onChangeText={handleTitleChange}
                placeholder={t('createRequest.selectTags.requestTitlePlaceholder')}
                placeholderTextColor={colors.greyMuted}
                multiline
                submitBehavior="blurAndSubmit"
                returnKeyType="done"
                scrollEnabled={false}
                textAlignVertical="top"
                accessibilityLabel={t('createRequest.selectTags.requestTitleLabel')}
              />
              {showTitleCount && (
                <View style={styles.titleFooter}>
                  <Text style={[styles.titleCount, titleLimitReached && styles.titleLimitReached]}>
                    {t(titleLimitReached
                      ? 'createRequest.selectTags.requestTitleLimitReached'
                      : 'createRequest.selectTags.requestTitleCharacterCount', {
                      count: titleCharacterCount,
                      max: REQUEST_TITLE_MAX_LENGTH,
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Section header with live selection count */}
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name="pricetags-outline" size={15} color={colors.primary} />
            </View>
            <Text style={styles.label}>{t('createRequest.selectTags.tagsTitle')}</Text>
            {selectedTags.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{selectedTags.length}</Text>
              </View>
            )}
          </View>

          {service.tags && service.tags.length > 0 ? (
            <>
              <ScrollView horizontal
                contentContainerStyle={styles.tagGrid}
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}>
                {Array.from({ length: Math.ceil(service.tags.length / tagsPerRow) }, (_, rowIndex) => (
                  <View key={rowIndex} style={styles.tagsRow}>
                    {service.tags.slice(rowIndex * tagsPerRow, (rowIndex + 1) * tagsPerRow).map(tag => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => toggleTag(tag)}
                          style={[styles.tagChip, selected && styles.tagChipSelected]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                          <Ionicons
                            name={selected ? 'checkmark-done' : 'add-circle-outline'}
                            size={15}
                            color={selected ? colors.primary : colors.greyMuted}
                            style={styles.tagIcon}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.noTagsRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.grey} />
              <Text style={styles.noTagsText}>{t('createRequest.selectTags.noTagsAvailable')}</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.consentCard}
            onPress={() => setPhoneConsent(current => !current)}
            activeOpacity={0.8} accessibilityRole="switch"
            accessibilityState={{ checked: phoneConsent }}>
            <View style={styles.iconBadge}>
              <Ionicons name="call-outline" size={15} color={colors.primary} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>{t('createRequest.addDetails.consentTitle')}</Text>
              <Text style={styles.consentText}>{t('createRequest.selectTags.phoneConsent')}</Text>
            </View>
            <Switch
              value={phoneConsent}
              onValueChange={setPhoneConsent}
              trackColor={{ false: colors.greyLight, true: colors.primaryBorder }}
              thumbColor={phoneConsent ? colors.primary : colors.white}
              pointerEvents="none"
              accessibilityLabel={t('createRequest.selectTags.phoneConsent')}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.locationCard}
            onPress={handleEditLocation}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('common.change')}>
            <View style={styles.iconBadge}>
              <Ionicons name="location-outline" size={15} color={colors.primary} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>{t('createRequest.addDetails.locationTitle')}</Text>
              <Text style={styles.locationName} numberOfLines={2}>
                {selectedLocation.name || selectedLocation.description}
              </Text>
            </View>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
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
  titleField: {
    marginBottom: spacing.lg,
  },
  titleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontFamily: 'Google Sans Flex-Bold',
    color: colors.dark,
  },
  titleHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    color: colors.grey,
  },
  titleInputContainer: {
    position: 'relative',
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  titleInput: {
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
    color: colors.dark,
    fontSize: 15,
    lineHeight: 21,
  },
  titleInputWithCount: {
    paddingBottom: spacing.xl,
  },
  titleFooter: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.xs,
  },
  titleCount: {
    fontSize: 12,
    color: colors.grey,
  },
  titleLimitReached: {
    color: colors.error,
  },
  tagGrid: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.greyLight,
    backgroundColor: colors.white,
    margin: spacing.xs,
  },
  tagChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark,
    fontFamily: 'Google Sans Flex-SemiBold',
  },
  tagTextSelected: {
    color: colors.primary,
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
    fontSize: 13,
    color: colors.grey,
    marginLeft: spacing.sm,
    textAlign: 'center',
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: 2,
  },
  locationName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  consentText: {
    flex: 1,
    // marginLeft: spacing.sm,
    // marginRight: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.dark,
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
