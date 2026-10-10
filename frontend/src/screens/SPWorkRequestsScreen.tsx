import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Animated,
  PanResponder,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { acceptWorkRequest, listWorkRequests, undoAccept } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, surfaces } from '../theme';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import ServiceIcon from '../components/ServiceIcon';
import ProfileAvatar from '../components/ProfileAvatar';
import SafeBottomBanner from '../components/SafeBottomBanner';
import SkeletonLoader from '../components/SkeletonLoader';
import UpgradeProBanner from '../components/UpgradeProBanner';
import EmptyState from '../components/EmptyState';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo, getDistanceKm } from '../utils/commonUtils';
import Spinner from '../components/Spinner';
import SegmentedTabs from '../components/SegmentedTabs';
import RateAndReviewModal from '../components/RateAndReviewModal';
import ActionButton from '../components/ActionButton';

/** Helper: ensure provider has completed profile before using this screen */
function validateProviderProfile(user: any): { ok: boolean; next: 'services' | 'location' | null } {
  if (!user || user.role !== 'serviceProvider') return { ok: true, next: null };
  const sp = user.serviceProviderInfo || {};
  const hasServices = Array.isArray(sp.services) && sp.services.length > 0;
  const hasLocation = !!sp.location && typeof sp.location.lat === 'number' && typeof sp.location.lng === 'number';
  const validRadius = typeof sp.radius === 'number' && [5, 10, 15, 20].includes(sp.radius);
  if (!hasServices) return { ok: false, next: 'services' };
  if (!hasLocation || !validRadius) return { ok: false, next: 'location' };
  return { ok: true, next: null };
}

const SwipeableRequestCard: React.FC<{
  enabled: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: React.ReactNode;
}> = ({ enabled, onSwipeLeft, onSwipeRight, children }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const handlers = useRef({ enabled, onSwipeLeft, onSwipeRight });
  handlers.current = { enabled, onSwipeLeft, onSwipeRight };
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      handlers.current.enabled &&
      Math.abs(gesture.dx) > 10 &&
      Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (_, gesture) =>
      translateX.setValue(Math.max(-50, Math.min(50, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx >= 50) handlers.current.onSwipeRight?.();
      if (gesture.dx <= -50) handlers.current.onSwipeLeft?.();
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () =>
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
  })).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX }] }}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Service provider work requests screen.  Displays available and accepted
 * requests, allows filtering by date or distance, and lets providers
 * express interest in new requests.  The layout mirrors the provided mockup with a
 * header, segmented control, filter chips, stylised cards and a
 * promotional banner.
 */
const SPWorkRequestsScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useI18n();
  const { showToast } = useToast();
  const timeAgo = buildTimeAgo(t);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'accepted' | 'closed'>('all');
  const [closedRequests, setClosedRequests] = useState<any[]>([]);
  const [closedLoading, setClosedLoading] = useState(false);
  const [closedRequestsLoaded, setClosedRequestsLoaded] = useState(false);
  const [ratingRequest, setRatingRequest] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'within3'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(() => new Set());
  const processingRequestIdsRef = useRef(processingRequestIds);
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const [showProBanner, setShowProBanner] = useState(true);
  const notificationRequestId = route.params?.highlightedRequestId as string | undefined;
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(
    notificationRequestId || null);
  const listRef = useRef<FlatList<any>>(null);
  const userId = user?.id;
  const requestsCacheKey = userId ? offlineCacheKey('provider-requests', userId) : null;
  const closedRequestsCacheKey = userId ? offlineCacheKey('provider-closed-requests', userId) : null;

  const updateRequestProcessing = (id: string, processing: boolean) => {
    const next = new Set(processingRequestIdsRef.current);
    if (processing) next.add(id);
    else next.delete(id);
    processingRequestIdsRef.current = next;
    setProcessingRequestIds(next);
  };
  
  const filterOptions = [
    { value: 'all', labelKey: 'spRequests.filterAll', iconName: 'apps-outline' },
    { value: 'today', labelKey: 'spRequests.filterToday', iconName: 'time-outline' },
    { value: 'within3', labelKey: 'spRequests.filterWithin3', iconName: 'navigate-outline' },
  ] as const;

  // Fetch work requests from the API
  const fetchRequests = async () => {
    if (!token || !requestsCacheKey) return;
    try {
      setLoading(true);
      const cached = await readOfflineCache<any[]>(requestsCacheKey);
      if (cached) {
        setRequests(cached);
        setLoading(false);
      }
      const list = await listWorkRequests(token);
      const nextRequests = Array.isArray(list) ? list : list.requests || [];
      setRequests(nextRequests);
      await writeOfflineCache(requestsCacheKey, nextRequests);
      setRequestError(null);
    } catch (err: any) {
      // If backend indicates incomplete profile, route to the appropriate step
      const status = err?.response?.status;
      const message = err?.response?.data?.message || '';
      if (status === 400) {
        const v = validateProviderProfile(user);
        if (!v.ok) {
          if (v.next === 'services') {
            navigation.navigate('SPSelectServices', { mode: 'onboarding', initialSelected: user?.serviceProviderInfo?.services || [] });
          } else if (v.next === 'location') {
            navigation.navigate('LocationSelect');
          }
          setRequestError(err);
          return;
        }
        // If provider profile not found, start services step
        if (/provider profile not found/i.test(message)) {
          navigation.navigate('SPSelectServices', { mode: 'onboarding' });
          setRequestError(err);
          return;
        }
        // If location/radius not defined
        if (/location or radius not defined/i.test(message)) {
          navigation.navigate('LocationSelect');
          setRequestError(err);
          return;
        }
      }
      setRequestError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedRequests = async () => {
    if (!token || !closedRequestsCacheKey) return;
    try {
      setClosedLoading(true);
      const cached = await readOfflineCache<any[]>(closedRequestsCacheKey);
      if (cached) setClosedRequests(cached);
      const list = await listWorkRequests(token, 'closed');
      const nextRequests = Array.isArray(list) ? list : list.requests || [];
      setClosedRequests(nextRequests);
      await writeOfflineCache(closedRequestsCacheKey, nextRequests);
      setClosedRequestsLoaded(true);
      setRequestError(null);
    } catch (err) {
      setRequestError(err);
    } finally {
      setClosedLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Guard: ensure provider profile completeness before loading data
      const v = validateProviderProfile(user);
      if (!v.ok) {
        if (v.next === 'services') {
          navigation.navigate('SPSelectServices', { mode: 'onboarding', initialSelected: user?.serviceProviderInfo?.services || [] });
        } else if (v.next === 'location') {
          navigation.navigate('LocationSelect');
        }
        return;
      }
      fetchRequests();
    }, [token, user, requestsCacheKey])
  );

  /**
   * Express interest in a work request and refresh the list on success.
   */
  const handleAccept = async (item: any) => {
    if (!token || processingRequestIdsRef.current.has(item.id)) return;
    updateRequestProcessing(item.id, true);
    try {
      await acceptWorkRequest(token, item.id);
      setRequestError(null);
      // Refreshing the list updates this card to the interested state.
      await fetchRequests();
    } catch (err: any) {
      setRequestError(err);
    } finally {
      updateRequestProcessing(item.id, false);
    }
  };

  const confirmWithdraw = async (item: any) => {
    if (!token || processingRequestIdsRef.current.has(item.id)) return;
    updateRequestProcessing(item.id, true);
    try {
      await undoAccept(token, item.id);
      setRequestError(null);
      await fetchRequests();
    } catch (err: any) {
      setRequestError(err);
    } finally {
      updateRequestProcessing(item.id, false);
    }
  };

  const handleWithdraw = (item: any) => Alert.alert(
    t('spRequests.undoAcceptTitle'),
    t('spRequests.undoAcceptConfirmation'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('spRequests.undoAccept'), style: 'destructive', onPress: () => { void confirmWithdraw(item); } },
    ],
  );

  /**
   * Open directions from SP's base location to the work request location.
   * On iOS, tries Google Maps first, then falls back to Apple Maps.
   * On Android, uses Google Maps.
   */
  const handleNavigate = (item: any) => {
    try {
      const destLat = item.locationLat;
      const destLng = item.locationLng;
      if (destLat == null || destLng == null) {
        Alert.alert('Error', 'Work request location is not available.');
        return;
      }
      // If SP has a base location, use it as origin
      const originLat = user?.serviceProviderInfo?.location?.lat;
      const originLng = user?.serviceProviderInfo?.location?.lng;
      
      if (Platform.OS === 'ios') {
        // On iOS, try Google Maps first, then fall back to Apple Maps
        const googleMapsUrl = originLat != null && originLng != null
          ? `comgooglemaps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`
          : `comgooglemaps://?daddr=${destLat},${destLng}`;
        
        const appleMapsUrl = originLat != null && originLng != null
          ? `maps://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`
          : `maps://maps.apple.com/?daddr=${destLat},${destLng}`;
        
        Linking.openURL(googleMapsUrl).catch(() => {
          // If Google Maps not available, try Apple Maps
          Linking.openURL(appleMapsUrl).catch(() => {
            Alert.alert('Error', 'Unable to open maps application.');
          });
        });
      } else {
        // Use Google Maps on Android
        const mapsUrl = originLat != null && originLng != null
          ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`
          : `https://maps.google.com/?daddr=${destLat},${destLng}`;
        
        Linking.openURL(mapsUrl).catch(() => {
          Alert.alert('Error', 'Unable to open maps application.');
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to open directions.');
    }
  };

  /**
   * Determine whether the current user has already accepted a given request.
   */
  const isAcceptedByUser = (item: any) => {
    return item.acceptedByProvider;
  };

  /**
   * Derive a filtered list of requests based on the selected tab and
   * filter.  Sorting is performed such that accepted requests appear
   * below available ones when on the All tab.
   */
  const filteredRequests = useMemo(() => {
    let list = requests.slice();
    // Filter by accepted/unaccepted
    if (tab === 'accepted') {
      list = list.filter(item => isAcceptedByUser(item));
    }
    // Apply additional filters
    const now = new Date();
    list = list.filter(item => {
      // Filter by time: requested today
      if (filter === 'today') {
        const created = new Date(item.createdAt);
        const diff = now.getTime() - created.getTime();
        return diff < 24 * 60 * 60 * 1000;
      }
      // Filter by distance: within 3 km
      if (filter === 'within3') {
        if (!user?.serviceProviderInfo?.location) return false;
        const lat1 = user.serviceProviderInfo.location.lat;
        const lon1 = user.serviceProviderInfo.location.lng;
        const lat2 = item.locationLat;
        const lon2 = item.locationLng;
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return false;
        const d = getDistanceKm(lat1, lon1, lat2, lon2);
        return d <= 3;
      }
      return true;
    });
    // Sort: show most recent requests first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [requests, tab, filter, user]);

  useEffect(() => {
    if (!notificationRequestId) return;
    setHighlightedRequestId(notificationRequestId);
    const index = filteredRequests.findIndex((item) => item.id === notificationRequestId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.25 });
      navigation.setParams({ highlightedRequestId: undefined });
    }, 0);
    return () => clearTimeout(timer);
  }, [notificationRequestId, filteredRequests, navigation]);

  /**
   * Renders a single work request card.  The card appearance and
   * available actions depend on whether the provider has expressed interest.
   * Interested cards show a green status chip and a prominent call button.
   * Available cards show an interest action, Navigate
   * and Call actions with a clear visual hierarchy.
   */
  const renderRequest = ({ item }: { item: any }) => {
    const isClosedRequest = tab === 'closed';
    const accepted = isAcceptedByUser(item);
    const rateEndUserLabel = t('requestDetails.rateEndUserNamed', {
      name: item.endUserName || t('requestDetails.endUser'),
    });
    const highlighted = item.id === highlightedRequestId;
    const processing = processingRequestIds.has(item.id);
    const timeLabel = timeAgo(item.createdAt);
    // Fresh requests (under 2 hours old) get a "New" badge
    const isNew = !isClosedRequest &&
      !accepted && Date.now() - new Date(item.createdAt).getTime() < 2 * 60 * 60 * 1000;
    // Compute distance if provider location is available
    let distanceLabel: string | null = null;
    if (user?.serviceProviderInfo?.location) {
      const d = getDistanceKm(
        user.serviceProviderInfo.location.lat,
        user.serviceProviderInfo.location.lng,
        item.locationLat,
        item.locationLng
      );
      distanceLabel = d <= 1
        ? t('spRequests.withinOneKm') : t('spRequests.distanceAway', { distance: d.toFixed(1) });
    }

    return (
      <SwipeableRequestCard
        enabled={!isClosedRequest && !processing}
        onSwipeRight={accepted
          ? () => showToast(t('spRequests.alreadyAccepted'))
          : () => handleAccept(item)}
        onSwipeLeft={accepted 
          ? () => handleWithdraw(item) 
          : () => showToast(t('spRequests.notYetAccepted'))}
      >
      <View
        style={[
          styles.card,
          accepted && styles.cardAccepted,
          highlighted && styles.cardHighlighted,
        ]}
      >
        {/* Service label and time/distance */}
        <View style={styles.cardHeader}>
          <ServiceIcon
            icon={item.serviceIcon}
            color={item.serviceColor}
            circleSize={44}
            iconSize={20}
          />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.serviceName} numberOfLines={1}>{item.serviceName}</Text>
            <View style={styles.metaRow}>
              {!!distanceLabel && (
                <>
                  <Ionicons name="location-outline" size={13} color={colors.greyMuted} />
                  <Text style={styles.metaText}>{distanceLabel}</Text>
                  <View style={styles.metaDot} />
                </>
              )}
              <Ionicons name="time-outline" size={13} color={colors.greyMuted} />
              <Text style={styles.metaText}>{timeLabel}</Text>
              
            </View>
          </View>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{t('spRequests.newBadge')}</Text>
            </View>
          )}
          {accepted && (
            <View style={styles.acceptedChip}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.acceptedChipText}>{t(isClosedRequest ? 'spRequests.closedChip' : 'spRequests.acceptedChip')}</Text>
            </View>
          )}
        </View>
        {/* Location and end user */}
        <View style={styles.infoRow}>
          <Ionicons name="location-sharp" size={15} color={colors.grey} />
          <Text style={styles.infoText} numberOfLines={2}>{item.locationName}</Text>
          {!isClosedRequest && (
            <TouchableOpacity
              onPress={() => handleNavigate(item)}
              hitSlop={6} style={styles.addressNavigateButton}
              accessibilityRole="button" accessibilityLabel={t('spRequests.navigate')}>
              <Ionicons name="navigate-outline" size={17} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
        {!!item.endUserName && (
          <View style={styles.infoRow}>
            <ProfileAvatar picUrl={item.endUserPicUrl} profileName={item.endUserName} size={32} />
            <Text style={styles.infoTextMuted} numberOfLines={1}>{item.endUserName}</Text>
          </View>
        )}
        {/* Tags */}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <View style={styles.tagContainer}>
            {item.tags.slice(0, 3).map((tag: string) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Action buttons: all CTAs share the same size in every state;
            only the background/label colours change. */}
        {(!isClosedRequest || item.canRateEndUser) && <>
          <View style={styles.divider} />
          <View style={styles.actionRow}>
          {isClosedRequest ? (
            <ActionButton
              buttonIcon="star"
              buttonTitle={rateEndUserLabel}
              showRightArrow={false}
              buttonTitleColor={colors.white}
              backgroundColor={colors.primary}
              onPress={() => setRatingRequest(item)}
              style={styles.requestActions}
            />
          ) : (
          <>
          
          <ActionButton
            buttonIcon={accepted ? "checkmark-circle" : "checkmark-circle-outline"}
            buttonTitle={ t('spRequests.accept')}
            buttonTitleColor={colors.white}
            backgroundColor={accepted ? colors.greyMuted : colors.success}
            onPress={() => accepted ? handleWithdraw(item) : handleAccept(item)}
            loading={processing}
            style={styles.requestActions}
          />
          
          {item.phoneConsent === true && item.endUserPhone && (
            <ActionButton
              buttonIcon="call-outline"
              buttonTitle={t('spRequests.call')}
              buttonTitleColor={colors.white}
              backgroundColor={colors.successDark}
              onPress={() => {
                if (item.endUserPhone) {
                  Linking.openURL(`tel:${item.endUserPhone}`);
                } else {
                  Alert.alert('Error', 'Requester phone number is not available.');
                }
              }}
              style={styles.requestActions}
            />
          )}
          </>
          )}
          </View>
        </>}
      </View>
      </SwipeableRequestCard>
    );
  };

  const handleEndUserRatingSuccess = () => {
    if (!ratingRequest) return;
    setClosedRequests(current => current.map(request => request.id === ratingRequest.id
      ? { ...request, canRateEndUser: false }
      : request));
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    if (!token || !requestsCacheKey) return;
    if (tab === 'closed') {
      setRefreshing(true);
      await fetchClosedRequests();
      setRefreshing(false);
      return;
    }
    try {
      setRefreshing(true);
      const latestRequests = await listWorkRequests(token);
      const latest = Array.isArray(latestRequests) ? latestRequests : latestRequests.requests || [];
      setRequests(prevRequests => {
        const newRequests = latest.filter(
          (newReq: any) => !prevRequests.some((prevReq: any) => prevReq.id === newReq.id)
        );
        return [...newRequests, ...prevRequests];
      });
      await writeOfflineCache(requestsCacheKey, latest);
      setRequestError(null);
    } catch (err) {
      setRequestError(err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && requests.length === 0) {
    // First load: keep the header/chrome visible and show placeholder cards
    // instead of flashing a blank full-screen spinner.
    return (
      <View style={{ flex: 1 }}>
        <Header
          title="Aasaan"
          showBackButton={false}
          showNotification={true}
          showProfileButton={true}
        />
        <View style={styles.container}>
          <SkeletonLoader count={4} />
        </View>
      </View>
    );
  }

  // Counts for segmented control
  const totalCount = requests.length;
  const acceptedCount = requests.filter(r => isAcceptedByUser(r)).length;
  const displayedRequests = tab === 'closed' ? closedRequests : filteredRequests;

  return (
    <View style={{ flex: 1 }}>
      <Header 
        title="Aasaan" 
        showBackButton={false} 
        showNotification={true}
        showProfileButton={true} 
        titleStyle={{ fontSize: 21, fontWeight: '700' }}
      />
      <View style={{ height: spacing.sm }} />
      <View style={styles.container}>
        <Text style={styles.pageTitle}>{t('spRequests.title')}</Text>
        <SegmentedTabs
          activeKey={tab}
          onChange={(key) => {
            const nextTab = key as 'all' | 'accepted' | 'closed';
            setTab(nextTab);
            if (nextTab === 'closed' && !closedRequestsLoaded && !closedLoading) fetchClosedRequests();
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          tabs={[
            { key: 'all', label: t('spRequests.allTab'), count: totalCount },
            { key: 'accepted', label: t('spRequests.acceptedTab'), count: acceptedCount },
            { key: 'closed', label: t('spRequests.closedTab'), count: closedRequestsLoaded ? closedRequests.length : undefined },
          ]}
        />
        {/* Filter chips */}
        {tab !== 'closed' && <View style={styles.filterRow}>
          {filterOptions.map(({ value, labelKey, iconName }) => {
            const active = filter === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setFilter(value)}
                activeOpacity={0.8}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityRole="button" accessibilityState={{ selected: active }}>
                  <Ionicons name={iconName} size={14} color={active ? 'white' : colors.grey} style={{ marginRight: 5 }}/>
                  <Text style={[styles.filterLabel, active && { color: 'white' }]}>{t(labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>}
        {/* Loading indicator when few requests are available */}
        <View style={styles.loadingRow}>
          {loading && requests.length > 0 && (
            <Spinner size="small" color={colors.primary} style={{ marginBottom: spacing.sm }} />
          )}
        </View>
        {/* List */}
        {tab === 'closed' && closedLoading && closedRequests.length === 0 ? (
          <SkeletonLoader count={4} />
        ) : displayedRequests.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title={t(tab === 'closed' ? 'spRequests.emptyClosed' : tab === 'accepted' ? 'spRequests.emptyAccepted' : 'spRequests.empty')}
            description={t(tab === 'closed' ? 'spRequests.emptyClosedHint' : tab === 'accepted' ? 'spRequests.emptyHintAccepted' : 'spRequests.emptyHint')} />
        ) : (
          <FlatList
            ref={listRef}
            data={displayedRequests}
            keyExtractor={(item: any) => item.id}
            renderItem={renderRequest}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              listRef.current?.scrollToOffset({
                offset: Math.max(0, averageItemLength * index),
                animated: true,
              });
            }}
            contentContainerStyle={{ marginTop: spacing.md, paddingBottom: spacing.xl * 3 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                title={refreshing ? t('spRequests.fetchingLatest') : ''}
                titleColor={colors.primary}
              />
            }
          />
        )}
        {/* Pro banner */}
        {showProBanner && (
          <UpgradeProBanner
            variant="compact"
            onPress={() => navigation.navigate('Subscription')}
            onClose={() => setShowProBanner(false)}
          />
        )}
        <ErrorBanner error={requestError} onRetry={tab === 'closed' ? fetchClosedRequests : fetchRequests} />
        <RateAndReviewModal
          mode="endUser"
          visible={!!ratingRequest}
          request={ratingRequest}
          token={token}
          onClose={() => setRatingRequest(null)}
          onSuccess={handleEndUserRatingSuccess}
        />
        {/* Safe area overlay to prevent content overlap with device buttons */}
        <SafeBottomBanner />
      </View>
    </View>
  );
};

// Styles extracted to a StyleSheet for clarity.  Colours and spacing come
// from the theme to ensure consistency across screens.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pageTitle: {
    marginBottom: spacing.sm,
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
  },
  loadingRow: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  // --- Filter chips ---
  filterRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: '600',
  },
  // --- Request cards ---
  card: {
    ...surfaces.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardAccepted: {
    borderColor: '#bbf7d0',
  },
  cardHighlighted: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: colors.grey,
    marginLeft: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.greyMuted,
    marginHorizontal: 6,
  },
  newBadge: {
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark,
  },
  acceptedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  acceptedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark,
    marginLeft: 6,
  },
  addressNavigateButton: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    backgroundColor: colors.successLight
  },
  infoTextMuted: {
    flex: 1,
    fontSize: 13,
    color: colors.grey,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  tagChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    fontSize: 12,
    color: colors.dark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.greyLight,
    marginVertical: spacing.xs,
  },
  // --- Action buttons (CTAs) ---
  // Every CTA shares one fixed shape; state changes swap colours only,
  // never dimensions, so buttons look consistent across cards/states.
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  // Spacing-only; the button shape itself now comes from ActionButton.
  requestActions: {
    marginRight: spacing.sm,
    paddingLeft: spacing.mdPlus,
    minWidth: 135,
  },
});

export default SPWorkRequestsScreen;