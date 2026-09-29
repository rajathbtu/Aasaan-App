import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator, // Import loader component
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { getWorkRequest } from '../api/index';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import WorkRequestCard from '../components/WorkRequestCard';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo, getDistanceKm } from '../utils/commonUtils';
import SafeBottomBanner from '../components/SafeBottomBanner';
import RateServiceProviderModal from '../components/RateServiceProviderModal';
import ActionButton from '../components/ActionButton';
import SkeletonLoader from '../components/SkeletonLoader';
import ProfileAvatar from '../components/ProfileAvatar';

const getProfileAge = (birthYear: number, now = new Date()): number => now.getFullYear() - birthYear;

const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const [request, setRequest] = useState(route.params?.request || null);
  const [closeVisible, setCloseVisible] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'initial' | 'details' | 'idle'>(
    route.params?.request ? 'details' : 'initial'
  );
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const requestId = route.params?.id || route.params?.request?.id;
  const cacheKey = requestId && user?.id ? offlineCacheKey('work-request', user.id, requestId) : null;

  useEffect(() => {
    let isMounted = true;
    const loadRequest = async () => {
      if (!requestId) return;
      if (cacheKey && !route.params?.request) {
        const cached = await readOfflineCache<any>(cacheKey);
        if (cached && isMounted) {
          setRequest(cached);
          setLoadingStage('idle');
        }
      }
      if (!token) {
        if (isMounted) setLoadingStage('idle');
        return;
      }
      setLoadingStage('details');
      try {
        const data = await getWorkRequest(token, requestId);
        if (isMounted) {
          setRequest((currentRequest: any) => ({
            ...currentRequest,
            ...data,
            serviceName: data.serviceName || currentRequest?.serviceName,
            serviceIcon: data.serviceIcon || currentRequest?.serviceIcon,
            serviceColor: data.serviceColor || currentRequest?.serviceColor,
          }));
        }
        if (cacheKey) await writeOfflineCache(cacheKey, data);
        setRequestError(null);
      } catch (err) {
        setRequestError(err);
      } finally {
        if (isMounted) setLoadingStage('idle');
      }
    };
    loadRequest();

    return () => {
      isMounted = false;
    };
  }, [requestId, token, cacheKey, route.params?.request]);

  if (!request) {
    // While the details are still loading, keep the spinner up instead of
    // briefly flashing "Request not found" (e.g. deep-link from a push or
    // in-app notification, where no cached/request payload exists yet).
    if (loadingStage !== 'idle') {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ErrorBanner error={requestError} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('requestDetails.notFound')}</Text>
        <ErrorBanner error={requestError} />
      </View>
    );
  }

  const handleBoost = () => {
    navigation.navigate('BoostRequest', { request });
  };

  const handleClose = () => {
    setCloseVisible(true);
  };

  const status = (request.status || 'active').toString().toLowerCase();
  const isCompleted = status === 'completed' || status === 'closed';
  const acceptedCount = request.acceptedProviders?.length || 0;

  return (
      <View style={styles.screen}>
      <Header title={t('requestDetails.title')} showBackButton={true} showNotification={false} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <WorkRequestCard
          request={request}
          showExpanded = {true}
          showResponseStatus = {false}
          containerStyle={styles.summaryCard}  />

        {(loadingStage === 'details' || (request.acceptedProviders && request.acceptedProviders.length > 0)) && (
          <View style={styles.acceptedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.acceptedTitle}>{t('requestDetails.providers')}</Text>
              <View style={styles.acceptedCountBadge} accessibilityLabel={`${acceptedCount} service providers`}>
                <Ionicons name="people-outline" size={16} color={colors.primary} />
                <Text style={styles.acceptedCount}>{acceptedCount}</Text>
              </View>
            </View>
            {loadingStage === 'details' ? (
              <SkeletonLoader count={1}/>
            ) : (
              <> 
                {request.acceptedProviders.map((p: any, index: number) => {
              const provider = p.provider || {};
              const displayName = provider.name || p.providerId || t('requestDetails.provider');
              const phone = provider.phoneNumber || '';
              const avatarUri = provider.avatarUrl || undefined;
              const providerInfo = provider.serviceProviderInfo || {};
              const currentYear = new Date().getFullYear();
              const age = providerInfo.birthYear ? getProfileAge(providerInfo.birthYear) : '';
              const workExperience = providerInfo.workSinceYear ? currentYear - providerInfo.workSinceYear : '';
              const providerLocation = providerInfo.location;
              const hasRequestLocation = Number.isFinite(request.locationLat) && Number.isFinite(request.locationLng);
              const hasProviderLocation = Number.isFinite(providerLocation?.lat) && Number.isFinite(providerLocation?.lng);
              const distance = hasRequestLocation && hasProviderLocation
                ? getDistanceKm(request.locationLat, request.locationLng, providerLocation.lat, providerLocation.lng)
                : null;
              const distanceLabel = distance? distance>2 ? t('requestDetails.distanceKm', { distance: distance.toFixed(1)}): t('requestDetails.nearYou')
                : null;
              const joinedDate = provider.createdAt ? new Date(provider.createdAt) : null;
              const tenureLabel = joinedDate && Number.isFinite(joinedDate.getTime())
                ? t('requestDetails.membersince', { timeAgo: timeAgo(joinedDate) })
                : t('requestDetails.unavailable');
              const reviewCount = provider.providerRating?.count ?? 0;
              const rating = provider.providerRating?.average;
              const experienceLabel = workExperience ? t('requestDetails.experience', { years: workExperience })
                : null;
              const ageLabel = age? t('requestDetails.ageShort', { age }): null;
                
              const genderIcon = providerInfo.gender === 'female' ? 'woman' : providerInfo.gender === 'male' ? 'man' : 'person-outline';
              const genderColor = providerInfo.gender === 'female'? '#ec4899' 
                  : providerInfo.gender === 'male'? '#2a47ea' : colors.grey;
              return (
                <View key={p.id || p.providerId || index} style={styles.providerCard}>
                  <View style={styles.providerHeader}>
                        <ProfileAvatar profilePic={avatarUri} profileName={displayName} />
                        <View style={styles.providerDetails}>
                          <Text style={styles.providerName}>{displayName}</Text>
                          <View style={styles.ratingRow}>
                            {reviewCount > 0 && rating !== null && rating !== undefined ? (
                              <>
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={16} color={i <= Math.round(rating) ? colors.secondary : colors.greyMuted} style={styles.ratingIcon} />
                                ))}
                                <Text style={styles.ratingText}>{rating.toFixed(1)} ({reviewCount})</Text>
                              </>
                            ) : (
                              <Text style={styles.ratingText}>{t('requestDetails.noRatings')}</Text>
                            )}
                          </View>
                        </View>
                        <ActionButton
                          buttonIcon="call"
                          buttonTitle={t('requestDetails.call')}
                          showRightArrow = {false}
                          buttonTitleColor={colors.white}
                          backgroundColor={colors.primary}
                          onPress={() => {
                            Linking.openURL(`tel:${phone}`).catch(() => Alert.alert(t('requestDetails.callFailedTitle'), t('requestDetails.callFailedDesc')));
                          }}/>
                  </View>
                  <View style={styles.providerMetaRow}>
                    {ageLabel !== null && (
                      <View style={styles.providerMetaItem}>
                        <Ionicons name={genderIcon as keyof typeof Ionicons.glyphMap} size={12} color={genderColor} />
                        <Text style={styles.providerMeta}>{ageLabel}</Text>
                      </View>
                    )}
                    {experienceLabel !== null && (
                      <View style={styles.providerMetaItem}>
                        <Ionicons name="briefcase-outline" size={12} color={colors.grey} />
                        <Text style={styles.providerMeta}>{experienceLabel}</Text>
                      </View>
                    )}
                    {distanceLabel !== null && (
                      <View style={styles.providerMetaItem}>
                        <Ionicons name="location-outline" size={12} color={colors.grey} />
                        <Text style={styles.providerMeta}>{distanceLabel}</Text>
                      </View>
                    )}
                    <View style={styles.providerMetaItem}>
                      <Ionicons name="shield-checkmark-outline" size={12} color={colors.grey} />
                      <Text style={styles.providerMeta}>{t('requestDetails.verified')}</Text>
                    </View>
                    <View style={styles.providerMetaItem}>
                      <Ionicons name="time-outline" size={12} color={colors.grey} />
                      <Text style={styles.providerMeta}>{tenureLabel}</Text>
                    </View>
                  </View>
                  {typeof providerInfo.bio === 'string' && providerInfo.bio.trim().length > 0 && (
                    <View style={styles.providerBioBand}>
                      <Text style={styles.providerQuote}>❝</Text>
                      <Text style={styles.providerBio} numberOfLines={2}>{providerInfo.bio}</Text>
                    </View>
                  )}
                </View>
              );
                })}
              </>
            )}
          </View>
        )}

        {!isCompleted && (
          <View style={styles.actionButtonsRow}>
            <ActionButton
              buttonIcon="flash"
              buttonTitle={t('requestDetails.boost')}
              buttonSubTitle={t('requestDetails.boostSubtitle')}
              showRightArrow = {false}
              buttonTitleColor="#c2410c"
              backgroundColor="#fff7ed"
              onPress={handleBoost} />
            <ActionButton
              buttonIcon="close-circle-outline"
              buttonTitle={t('requestDetails.close')}
              buttonSubTitle={t('requestDetails.closeSubtitle')}
              showRightArrow = {false}
              buttonTitleColor="#b91c1c"
              backgroundColor="#fff5f5"
              onPress={handleClose} />
          </View>
        )}
      </ScrollView>

      <RateServiceProviderModal
        visible={closeVisible}
        request={request}
        token={token}
        onClose={() => setCloseVisible(false)}
        onSuccess={(closedRequest) => {
          setCloseVisible(false);
          setRequest(closedRequest);
          Alert.alert(t('requestDetails.closedTitle'), t('requestDetails.closedDesc'), [
            { text: t('requestDetails.ok'), onPress: () => navigation.goBack() },
          ]);
        }}
      />
      {!closeVisible && <ErrorBanner error={requestError} />}
      <SafeBottomBanner/>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
  },
  emptyText: {
    color: colors.dark,
    fontSize: 16,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  acceptedSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  acceptedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  acceptedCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  acceptedCount: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  providerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
    elevation: 2,
    shadowColor: colors.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  providerMeta: {
    fontSize: 12,
    color: colors.grey,
    flexShrink: 1,
  },
  providerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  providerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  providerBioBand: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  providerQuote: {
    color: colors.amber,
    fontSize: 40,
    lineHeight: 30,
    fontWeight: '500',
    marginRight: spacing.sm,
  },
  providerBio: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.grey,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.grey,
    marginLeft: 4,
  },
  ratingIcon: {
    marginRight: 2,
  },
});

export default WorkRequestDetailsScreen;