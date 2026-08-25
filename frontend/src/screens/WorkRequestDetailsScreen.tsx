import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  // SafeAreaView, // removed to avoid double safe-area with shared Header
  Linking,
  Image,
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
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo } from '../utils/time';
import SafeBottomBanner from '../components/SafeBottomBanner';
import ReviewRatingModal from '../components/ReviewRatingModal';

const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t, { absoluteAfterDays: 7 });
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
  const isActive = status === 'active';
  const isCompleted = status === 'completed' || status === 'closed';
  const serviceName = request.serviceName || request.service;
  const acceptedCount = request.acceptedProviders?.length || 0;
  const acceptedLabel = t('requestDetails.acceptedBy', { count: acceptedCount }).replace(/\s*\([^)]*\)\s*:?[\s]*$/, '');

  return (
      <View style={styles.screen}>
      <Header title={serviceName} showBackButton={true} showNotification={false} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Ionicons name={request.serviceIcon || 'construct'} size={22} color={colors.primary} />
            </View>
            <View style={styles.summaryTitleContainer}>
              <Text style={styles.summaryLabel}>{serviceName}</Text>
              <Text style={styles.summaryCaption}>{timeAgo(request.createdAt)}</Text>
            </View>
            {request.status !== undefined && (
              <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>{isActive ? t('requestDetails.statusActive') : (request.status as any)}</Text>
              </View>
            )}
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={colors.grey} />
            <Text style={styles.summaryValue} numberOfLines={2} ellipsizeMode="tail">{request.locationName || t('userRequests.locationFallback')}</Text>
          </View>
          {request.tags && request.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {request.tags.slice(0, 3).map((tag: string) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!isCompleted && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={[styles.actionButton, styles.boostButton]} onPress={handleBoost}>
              <Ionicons name="flash" size={17} color={colors.white} style={styles.actionIcon} />
              <Text style={styles.boostButtonText}>{t('requestDetails.boost')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.closeButton]} onPress={handleClose}>
              <Ionicons name="close-circle-outline" size={17} color={colors.dark} style={styles.actionIcon} />
              <Text style={styles.closeButtonText}>{t('requestDetails.close')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {(loadingStage === 'details' || (request.acceptedProviders && request.acceptedProviders.length > 0)) && (
          <View style={styles.acceptedSection}>
            {loadingStage === 'details' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.acceptedTitle}>{acceptedLabel}</Text>
                  <View style={styles.acceptedCountBadge} accessibilityLabel={`${acceptedCount} service providers`}>
                    <Ionicons name="people-outline" size={16} color={colors.primary} />
                    <Text style={styles.acceptedCount}>{acceptedCount}</Text>
                  </View>
                </View>
                {request.acceptedProviders.map((p: any, index: number) => {
              const provider = p.provider || {};
              const displayName = provider.name || p.providerId || t('requestDetails.provider');
              const phone = provider.phoneNumber || '';
              const avatarUri = provider.avatarUrl || undefined;
              return (
                <View key={p.id || p.providerId || index} style={styles.providerRow}>
                  {avatarUri ? (
                    <View style={styles.avatarImageWrapper}>
                      <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    </View>
                  ) : (
                    <View style={styles.providerAvatar}>
                      <Text style={styles.providerAvatarText}>{String(displayName).charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.providerDetails}>
                    <Text style={styles.providerName}>{displayName}</Text>
                    <View style={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons key={i} name={i <= 4 ? 'star' : 'star-outline'} size={12} color={i <= 4 ? colors.secondary : colors.greyMuted} style={{ marginRight: 2 }} />
                      ))}
                      <Text style={styles.ratingText}> (20)</Text>
                    </View>
                  </View>
                  <View style={styles.providerActions}>
                    <TouchableOpacity
                      style={styles.callButton}
                      accessibilityRole="button"
                      accessibilityLabel={t('requestDetails.call')}
                      onPress={() => {
                        if (!phone) { Alert.alert(t('requestDetails.callUnavailableTitle'), t('requestDetails.callUnavailableDesc')); return; }
                        Linking.openURL(`tel:${phone}`).catch(() => Alert.alert(t('requestDetails.callFailedTitle'), t('requestDetails.callFailedDesc')));
                      }}
                    >
                      <Ionicons name="call" size={18} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.infoButton}
                      accessibilityRole="button"
                      accessibilityLabel={t('requestDetails.provider')}
                      onPress={() => Alert.alert(t('requestDetails.provider'), displayName)}
                    >
                      <Ionicons name="information-circle" size={18} color={colors.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
                })}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <ReviewRatingModal
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryTitleContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
  },
  summaryCaption: {
    color: colors.grey,
    fontSize: 12,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
  },
  statusBadgeActive: {
    backgroundColor: colors.successLight,
  },
  statusBadgeInactive: {
    backgroundColor: colors.greyLight,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.dark,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.grey,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tagPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagPillText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.md,
  },
  actionIcon: {
    marginRight: spacing.sm,
  },
  boostButton: {
    backgroundColor: colors.primary,
  },
  boostButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  closeButtonText: {
    color: colors.dark,
    fontWeight: '600',
  },
  acceptedSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
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
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  providerAvatarText: {
    fontWeight: '700',
    color: colors.primary,
  },
  avatarImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.greyLight,
  },
  providerDetails: {
    flex: 1,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
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
  callButton: {
    width: 38,
    height: 38,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    width: 38,
    height: 38,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greyLight,
  },
});

export default WorkRequestDetailsScreen;