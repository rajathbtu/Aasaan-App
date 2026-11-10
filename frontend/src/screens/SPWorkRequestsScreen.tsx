import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
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
  LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { acceptWorkRequest, listWorkRequests, undoAccept } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';
import { spacing } from '../theme';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import ProfileAvatar from '../components/ProfileAvatar';
import SafeBottomBanner from '../components/SafeBottomBanner';
import SPProBanner from '../components/SPProBanner';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import { AirConditioner } from '../assets/images';
import SvgIcon from '../assets/icons';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo, getDistanceKm } from '../utils/commonUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Tag chip → icon mapping. First tag renders as the blue "service" tag. */
const TAG_CONFIG: Record<string, string> = {
  'AC Servicing': 'snowflake',
  'Cooling Issue': 'snowflake',
  Repair: 'wrench',
  'Noise Issue': 'sound',
  Installation: 'wrench',
  Maintenance: 'sliders',
  Cleaning: 'sliders',
  Plumbing: 'wrench',
  Electrical: 'bolt',
};

async function translateValues(values: string[], locale: string, sourceLocale: string | undefined,
    isCancelled: () => boolean, onUpdate: (translations: Record<string, string>) => void) {
  const translations: Record<string, string> = {};
  for (const value of values) {
    if (isCancelled()) return;
    try {
      const translated = await translateText(value, locale, sourceLocale);
      if (translated) translations[value] = translated;
    } catch (error) {
      console.warn('Failed to translate a work request:', error);
    }
    if (!isCancelled() && Object.keys(translations).length > 0) {
      onUpdate({ ...translations });
    }
  }
}

function translateText(value: string, locale: string, sourceLocale: string | undefined): Promise<string> {
  return Promise.resolve(value);
}

/** Helper: ensure provider has completed profile before using this screen */
function validateProviderProfile(user: any): { ok: boolean; next: 'services' | 'location' | null } {
  if (!user || user.role !== 'serviceProvider') return { ok: true, next: null };
  const sp = user.serviceProviderInfo || {};
  const hasServices = Array.isArray(sp.services) && sp.services.length > 0;
  const hasLocation = !!sp.location && typeof sp.location.lat === 'number' && typeof sp.location.lng === 'number';
  if (!hasServices) return { ok: false, next: 'services' };
  if (!hasLocation) return { ok: false, next: 'location' };
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
      handlers.current.enabled && Math.abs(gesture.dx) > 50 && Math.abs(gesture.dy) < 30,
    onPanResponderRelease: (_, gesture) => {
      if (!handlers.current.enabled) return;
      if (gesture.dx > 50) handlers.current.onSwipeRight?.();
      if (gesture.dx < -50) handlers.current.onSwipeLeft?.();
    },
  })).current;
  return (
    <Animated.View style={{ transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
};

const SPWorkRequestsScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const timeAgo = buildTimeAgo(t);
  const [requests, setRequests] = useState<any[]>([]);
  const requestsRef = useRef(requests);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'accepted' | 'closed'>('all');
  const [closedRequests, setClosedRequests] = useState<any[]>([]);
  const [closedLoading, setClosedLoading] = useState(false);
  const [closedRequestsLoaded, setClosedRequestsLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'within3'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(() => new Set());
  const processingRequestIdsRef = useRef(processingRequestIds);
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const [titleTranslations, setTitleTranslations] = useState<{ locale: string; values: Record<string, string> }>({ locale: '', values: {} });
  const [locationTranslations, setLocationTranslations] = useState<{ locale: string; values: Record<string, string> }>({ locale: '', values: {} });
  const [showProBanner, setShowProBanner] = useState(true);
  const [bannerExpanded, setBannerExpanded] = useState(true);
  const bannerHeight = useRef(new Animated.Value(188)).current;
  const manualBannerRef = useRef(false);
  const notificationRequestId = route.params?.highlightedRequestId as string | undefined;
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(notificationRequestId || null);
  const listRef = useRef<FlatList<any>>(null);
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, spacing.sm);
  const bottomNavHeight = 77;

  /* Sticky filter bar: appears once the filter row scrolls under the header
     (design: .filters{position:sticky;top:126px}) */
  const [filtersBottom, setFiltersBottom] = useState<number | null>(null);
  const [showStickyFilters, setShowStickyFilters] = useState(false);

  const onFilterRowLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    const bottom = y + height;
    setFiltersBottom(current => (current === null || Math.abs(current - bottom) > 4 ? bottom : current));
  }, []);

  const BANNER_SCROLL_THRESHOLD = 175;
  const BANNER_EXPAND_RESET = 24;

  const compactBanner = useCallback(() => {
    setBannerExpanded(current => {
      if (!current) return current;
      Animated.timing(bannerHeight, { toValue: 62, duration: 360, useNativeDriver: false }).start();
      return false;
    });
  }, [bannerHeight]);

  const expandBanner = useCallback((manual = false) => {
    if (manual) manualBannerRef.current = true;
    setBannerExpanded(current => {
      if (current) return current;
      Animated.timing(bannerHeight, { toValue: 188, duration: 360, useNativeDriver: false }).start();
      return true;
    });
  }, [bannerHeight]);

  const onScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    /* Banner collapse (design: trigger 175px, reset below 24px) */
    if (y < BANNER_EXPAND_RESET) manualBannerRef.current = false;
    if (y > BANNER_SCROLL_THRESHOLD && !manualBannerRef.current) compactBanner();
    else expandBanner();
    /* Sticky filters */
    if (filtersBottom !== null) {
      const next = y >= filtersBottom;
      setShowStickyFilters(current => (current === next ? current : next));
    }
  }, [compactBanner, expandBanner, filtersBottom]);

  const handleBannerPress = useCallback(() => expandBanner(true), [expandBanner]);
  const handleBannerClose = useCallback(() => setShowProBanner(false), []);

  const userId = user?.id;
  const requestsCacheKey = userId ? offlineCacheKey('provider-requests', userId) : null;
  const closedRequestsCacheKey = userId ? offlineCacheKey('provider-closed-requests', userId) : null;

  const isAcceptedByUser = (item: any) => item.acceptedByProvider;
  const filteredRequests = useMemo(() => {
    let list = requests.slice();
    if (tab === 'accepted') list = list.filter(isAcceptedByUser);
    const now = new Date();
    list = list.filter(item => {
      if (filter === 'today') { const c = new Date(item.createdAt); return now.getTime() - c.getTime() < 24 * 3600 * 1000; }
      if (filter === 'within3') {
        if (!user?.serviceProviderInfo?.location) return false;
        return getDistanceKm(user.serviceProviderInfo.location.lat, user.serviceProviderInfo.location.lng, item.locationLat, item.locationLng) <= 3;
      }
      return true;
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [requests, tab, filter, user]);

  const allRequests = useMemo(() => [...requests, ...closedRequests], [requests, closedRequests]);
  const requestTitles = useMemo(() => allRequests.map(r => (typeof r.title === 'string' ? r.title.trim() : '')).filter(Boolean), [allRequests]);
  const requestLocations = useMemo(() => allRequests.map(r => (typeof r.locationName === 'string' ? r.locationName.trim() : '')).filter(Boolean), [allRequests]);

  useEffect(() => {
    let cancelled = false;
    void translateValues(requestTitles, lang, undefined, () => cancelled,
      (values) => setTitleTranslations({ locale: lang, values }));
    return () => { cancelled = true; };
  }, [lang, requestTitles]);
  useEffect(() => {
    let cancelled = false;
    void translateValues(requestLocations, lang, 'en', () => cancelled,
      (values) => setLocationTranslations({ locale: lang, values }));
    return () => { cancelled = true; };
  }, [lang, requestLocations]);

  const updateRequestProcessing = (id: string, processing: boolean) => {
    setProcessingRequestIds(prev => {
      const next = new Set(prev);
      if (processing) next.add(id); else next.delete(id);
      processingRequestIdsRef.current = next;
      return next;
    });
  };

  const fetchRequests = async () => {
    if (!token || !requestsCacheKey) return;
    try {
      setLoading(true);
      const cached = await readOfflineCache<any[]>(requestsCacheKey);
      if (cached) { requestsRef.current = cached; setRequests(cached); }
      const list = await listWorkRequests(token);
      const nextRequests = Array.isArray(list) ? list : list.requests || [];
      requestsRef.current = nextRequests;
      setRequests(nextRequests);
      await writeOfflineCache(requestsCacheKey, nextRequests);
      setRequestError(null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) {
        const v = validateProviderProfile(user);
        if (!v.ok) {
          if (v.next === 'services') navigation.navigate('SPSelectServices', { mode: 'onboarding', initialSelected: user?.serviceProviderInfo?.services || [] });
          else if (v.next === 'location') navigation.navigate('LocationSelect');
          return;
        }
      }
      setRequestError(err);
    } finally { setLoading(false); }
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
    } catch (err) { setRequestError(err); }
    finally { setClosedLoading(false); }
  };

  useFocusEffect(useCallback(() => {
    const v = validateProviderProfile(user);
    if (!v.ok) {
      if (v.next === 'services') navigation.navigate('SPSelectServices', { mode: 'onboarding', initialSelected: user?.serviceProviderInfo?.services || [] });
      else if (v.next === 'location') navigation.navigate('LocationSelect');
      return;
    }
    fetchRequests();
  }, [token, user]));

  const updateRequestAcceptance = (id: string, accepted: boolean) => {
    const next = requestsRef.current.map(r => r.id === id ? { ...r, acceptedByProvider: accepted } : r);
    requestsRef.current = next;
    setRequests(next);
  };

  const handleAccept = async (item: any) => {
    if (!token || processingRequestIdsRef.current.has(item.id)) return;
    updateRequestProcessing(item.id, true);
    try {
      await acceptWorkRequest(token, item.id);
      setRequestError(null);
      updateRequestAcceptance(item.id, true);
    } catch (err) { setRequestError(err); }
    finally { updateRequestProcessing(item.id, false); }
  };

  const confirmWithdraw = async (item: any) => {
    if (!token || processingRequestIdsRef.current.has(item.id)) return;
    updateRequestProcessing(item.id, true);
    try {
      await undoAccept(token, item.id);
      setRequestError(null);
      updateRequestAcceptance(item.id, false);
    } catch (err) { setRequestError(err); }
    finally { updateRequestProcessing(item.id, false); }
  };

  const handleWithdraw = (item: any) => Alert.alert(t('spRequests.undoAcceptTitle'), t('spRequests.undoAcceptConfirmation'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('spRequests.undoAccept'), style: 'destructive', onPress: () => void confirmWithdraw(item) },
  ]);

  const handleNavigate = (item: any) => {
    try {
      const destLat = item.locationLat, destLng = item.locationLng;
      if (destLat == null || destLng == null) { Alert.alert('Error', 'Work request location is not available.'); return; }
      const originLat = user?.serviceProviderInfo?.location?.lat;
      const originLng = user?.serviceProviderInfo?.location?.lng;
      if (Platform.OS === 'ios') {
        const g = originLat != null && originLng != null ? `comgooglemaps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}` : `comgooglemaps://?daddr=${destLat},${destLng}`;
        Linking.openURL(g).catch(() => Linking.openURL(`maps://maps.apple.com/?daddr=${destLat},${destLng}`).catch(() => Alert.alert('Error', 'Unable to open maps.')));
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}${originLat != null && originLng != null ? `&origin=${originLat},${originLng}` : ''}`).catch(() => Alert.alert('Error', 'Unable to open maps.'));
      }
    } catch { Alert.alert('Error', 'Unable to open maps.'); }
  };

  const handleCall = (item: any) => {
    const canCallCustomer = !item.callDisabledReason && item.phoneConsent === true && !!item.endUserPhone;
    if (canCallCustomer) {
      void Linking.openURL(`tel:${item.endUserPhone}`);
      return;
    }
    const key = item.callDisabledReason === 'aadhaar_not_verified'
      ? 'spRequests.aadhaarVerificationRequired'
      : item.phoneConsent !== true
        ? 'spRequests.directCallNotAllowed'
        : 'spRequests.callUnavailable';
    showToast(t(key));
  };

  const onRefresh = async () => {
    if (!token || !requestsCacheKey) return;
    if (tab === 'closed') { setRefreshing(true); await fetchClosedRequests(); setRefreshing(false); return; }
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const displayedRequests = tab === 'closed' ? closedRequests : filteredRequests;

  const availableCount = tab === 'closed' ? closedRequests.length : requests.length;
  const acceptedCount = displayedRequests.filter(isAcceptedByUser).length;

  const filterOptions = [
    { value: 'within3', labelKey: 'spRequests.filterWithin3', icon: 'pin' },
    { value: 'today', labelKey: 'spRequests.filterToday', icon: 'clock' },
  ] as const;

  const filterChips = (activeOverride?: 'all' | 'today' | 'within3') => (
    <View style={styles.filterRow}>
      {filterOptions.map(({ value, labelKey, icon }) => {
        const active = (activeOverride ?? filter) === value;
        return (
          <TouchableOpacity
            key={value}
            onPress={() => setFilter(active ? 'all' : value)}
            style={[styles.filterChip, active && styles.filterChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <SvgIcon name={icon} size={16} color={C.brand} />
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{t(labelKey)}</Text>
            <SvgIcon name="chevron-down" size={12} color={C.dark} />
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={styles.filterMore}
        accessibilityRole="button"
        accessibilityLabel={t('spRequests.moreFilters')}>
        <SvgIcon name="sliders" size={20} color={C.dark} />
      </TouchableOpacity>
    </View>
  );

  /* ---- Request card (article.card) ---- */
  const renderRequest = ({ item }: { item: any }) => {
    const isClosedRequest = tab === 'closed';
    const accepted = isAcceptedByUser(item);
    const canCallCustomer = !item.callDisabledReason && item.phoneConsent === true && !!item.endUserPhone;
    const highlighted = item.id === highlightedRequestId;
    const processing = processingRequestIds.has(item.id);
    const originalTitle = typeof item.title === 'string' ? item.title.trim() : '';
    const translatedTitle = titleTranslations.locale === lang && titleTranslations.values[originalTitle]
      ? titleTranslations.values[originalTitle] : originalTitle;
    const originalLocation = typeof item.locationName === 'string' ? item.locationName.trim() : '';
    const translatedLocation = locationTranslations.locale === lang && locationTranslations.values[originalLocation]
      ? locationTranslations.values[originalLocation] : originalLocation;
    const timeLabel = timeAgo(item.createdAt);
    let distanceLabel: string | null = null;
    if (typeof item.distanceKm === 'number') {
      distanceLabel = item.distanceKm <= 1 ? t('spRequests.withinOneKm') : t('spRequests.distanceAway', { distance: item.distanceKm.toFixed(1) });
    } else if (user?.serviceProviderInfo?.location) {
      const d = getDistanceKm(user.serviceProviderInfo.location.lat, user.serviceProviderInfo.location.lng, item.locationLat, item.locationLng);
      distanceLabel = d <= 1 ? t('spRequests.withinOneKm') : t('spRequests.distanceAway', { distance: d.toFixed(1) });
    }
    const tags: string[] = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];

    return (
      <SwipeableRequestCard
        enabled={!isClosedRequest && !processing}
        onSwipeRight={accepted ? undefined : () => handleAccept(item)}
        onSwipeLeft={accepted ? () => handleWithdraw(item) : undefined}>
        <View style={[styles.card, accepted && styles.cardAccepted, highlighted && styles.cardHighlighted]}>
          {/* .card-top — service image + title/category/meta + interested badge */}
          <View style={styles.cardTop}>
            <View style={styles.serviceImage}>
              <AirConditioner size={80} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.requestTitle} numberOfLines={2}>{translatedTitle || item.serviceName}</Text>
              <Text style={styles.category} numberOfLines={1}>{item.serviceName}</Text>
              <View style={styles.metaRow}>
                {distanceLabel && (
                  <View style={styles.metaItem}>
                    <SvgIcon name="pin" size={14} color={C.dark} />
                    <Text style={styles.metaText}>{distanceLabel}</Text>
                  </View>
                )}
                {distanceLabel && <View style={styles.metaBar} />}
                <View style={styles.metaItem}>
                  <SvgIcon name="clock" size={14} color={C.dark} />
                  <Text style={styles.metaText}>{timeLabel}</Text>
                </View>
              </View>
            </View>
            {accepted && (
              <View style={styles.interestedBadge}>
                <SvgIcon name="check" size={11} color={C.brand} />
                <Text style={styles.interestedBadgeText}>{t('spRequests.acceptedChip')}</Text>
              </View>
            )}
          </View>

          {/* .location-bar — address + navigate */}
          <View style={styles.locationBar}>
            <View style={styles.locationBarPin}>
              <SvgIcon name="pin" size={21} color={C.brand} />
            </View>
            <Text style={styles.address} numberOfLines={1}>{translatedLocation}</Text>
            <TouchableOpacity
              style={styles.navigateBtn}
              onPress={() => handleNavigate(item)}
              accessibilityRole="button"
              accessibilityLabel={t('spRequests.navigate')}>
              <SvgIcon name="navigation" size={18} color={C.brand} />
            </TouchableOpacity>
          </View>

          {/* .tags — up to three chips, wrapping (no horizontal scroll) */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <SvgIcon name={(TAG_CONFIG[tag] || 'wrench') as any} size={15} color={C.brand} />
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.cardDivider} />

          {/* .customer-actions — customer | divider | call | interest */}
          <View style={styles.customerActions}>
            <View style={styles.customer}>
              <ProfileAvatar
                picUrl={item.endUserPicUrl || undefined}
                profileName={item.endUserName || t('requestDetails.endUser')}
                size={42}
                containerStyle={styles.avatar}
              />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName} numberOfLines={1}>{item.endUserName || t('requestDetails.endUser')}</Text>
              </View>
            </View>
            <View style={styles.verticalDivider} />
            <TouchableOpacity
              style={[styles.action, styles.actionCall, !canCallCustomer && styles.actionCallDisabled]}
              onPress={() => handleCall(item)}
              accessibilityRole="button"
              accessibilityLabel={t('spRequests.call')}>
              <SvgIcon name="phone" size={16} color={canCallCustomer ? C.dark : C.greyMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.action, styles.actionInterest]}
              onPress={() => {
                if (accepted) showToast(t('spRequests.alreadyAccepted'));
                else handleAccept(item);
              }}
              disabled={processing}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={t('spRequests.accept')}>
              {processing ? (
                <ActivityIndicator size="small" color={C.onPrimary} />
              ) : (
                <>
                  <SvgIcon name="check" size={16} color={C.onPrimary} />
                  <Text style={styles.actionTextInterest}>{t('spRequests.accept')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SwipeableRequestCard>
    );
  };

  const pageTopSection = (
    <View>
      {/* .filters — sticky on scroll; negative margin cancels the FlatList's
          horizontal padding so the filter bar runs edge-to-edge */}
      {tab !== 'closed' && (
        <View style={{ marginHorizontal: -12 }} onLayout={onFilterRowLayout}>{filterChips()}</View>
      )}
      {/* .page-title */}
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>{t('spRequests.title')}</Text>
        <Text style={styles.pageTitleCount}>{t('spRequests.availableCount', { count: availableCount })}</Text>
      </View>
    </View>
  );

  if (loading && requests.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <Header title="aasaanly" showBackButton={false} showNotification={true} showProfileButton={true} titleStyle={styles.logo} />
        <View style={styles.container}><SkeletonLoader count={4} /></View>
      </View>
    );
  }

  const listPaddingBottom = bottomNavHeight + safeBottom + (bannerExpanded ? 188 : 62);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <Header
        title="aasaanly"
        showBackButton={false}
        showNotification={true}
        showProfileButton={true}
        titleStyle={styles.logo} />
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={displayedRequests}
          keyExtractor={item => String(item.id)}
          renderItem={renderRequest}
          ListHeaderComponent={pageTopSection}
          ListEmptyComponent={(
            <EmptyState
              icon="briefcase-outline"
              title={t(tab === 'closed' ? 'spRequests.emptyClosed' : tab === 'accepted' ? 'spRequests.emptyAccepted' : 'spRequests.empty')}
              description={t(tab === 'closed' ? 'spRequests.emptyClosedHint' : tab === 'accepted' ? 'spRequests.emptyHintAccepted' : 'spRequests.emptyHint')} />
          )}
          refreshControl={(
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
          )}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: listPaddingBottom }}
          showsVerticalScrollIndicator={false} />

        {showStickyFilters && tab !== 'closed' && (
          <View style={styles.stickyFilters} pointerEvents="box-none">
            {filterChips()}
          </View>
        )}

        {!!requestError && (
          <View style={styles.errorBannerWrap}>
            <ErrorBanner error={requestError} onRetry={tab === 'closed' ? fetchClosedRequests : fetchRequests} />
          </View>
        )}
      </View>

      {/* .pro-banner — floats just above the bottom navigation */}
      {showProBanner && (
        <Animated.View style={[styles.floatingBanner, { bottom: bottomNavHeight + safeBottom, height: bannerHeight, left: 13, right: 13, zIndex: 40 }]}>
          <SPProBanner
            expanded={bannerExpanded}
            onPress={handleBannerPress}
            onClose={handleBannerClose}
            onUpgrade={() => navigation.navigate('Subscription')} />
        </Animated.View>
      )}

      {/* .bottom-nav — All / Interested / Closed (flush with the screen bottom;
          SafeBottomBanner paints the safe-area strip below it) */}
      <View style={styles.bottomNavBarWrap}>
        <TouchableOpacity
          style={[styles.bottomTab, tab === 'all' && styles.bottomTabActive]}
          onPress={() => { setTab('all'); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }}
          accessibilityRole="button"
          accessibilityLabel={t('spRequests.allTab')}>
          <SvgIcon name="home" size={23} color={tab === 'all' ? C.brand : C.dark} />
          <Text style={[styles.bottomTabLabel, tab === 'all' && styles.bottomTabLabelActive]}>{t('spRequests.allTab')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomTab, tab === 'accepted' && styles.bottomTabActive]}
          onPress={() => { setTab('accepted'); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }}
          accessibilityRole="button"
          accessibilityLabel={t('spRequests.acceptedTab')}>
          <View style={styles.bottomTabIconWrap}>
            <SvgIcon name="bookmark" size={23} color={tab === 'accepted' ? C.brand : C.dark} />
            {acceptedCount > 0 && (
              <View style={styles.bottomTabIconCount}>
                <Text style={styles.bottomTabIconCountText}>{acceptedCount > 9 ? '9+' : acceptedCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.bottomTabLabel, tab === 'accepted' && styles.bottomTabLabelActive]}>{t('spRequests.acceptedTab')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomTab, tab === 'closed' && styles.bottomTabActive]}
          onPress={() => {
            setTab('closed');
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            if (!closedRequestsLoaded) void fetchClosedRequests();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('spRequests.closedTab')}>
          <SvgIcon name="closed" size={23} color={tab === 'closed' ? C.brand : C.dark} />
          <Text style={[styles.bottomTabLabel, tab === 'closed' && styles.bottomTabLabelActive]}>{t('spRequests.closedTab')}</Text>
        </TouchableOpacity>
      </View>
      <SafeBottomBanner />
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  /* Brand word in the splash wordmark style — Quicksand letterforms and the
     splash green come from Header's brandTitle treatment. */
  logo: { fontSize: 25, letterSpacing: -0.8 },

  /* .filters{height:59px;padding:8px 13px;display:flex;gap:7px} */
  filterRow: {
    height: 59,
    paddingVertical: 8,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.white,
    shadowColor: '#101820',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  /* .filter-chip{height:39px;padding:0 11px;border:1px solid #eef0f2;border-radius:999px;gap:7px;font-size:12px;font-weight:750} */
  filterChip: {
    height: 39,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: C.headerBorder,
    backgroundColor: C.white,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  filterChipActive: { borderColor: C.brand, backgroundColor: C.backBg },
  filterChipText: { fontSize: 12, fontWeight: 700, color: C.dark },
  filterChipTextActive: { color: C.brand },
  /* .filter-more{width:40px;height:39px;border-radius:50%;margin-left:auto} */
  filterMore: {
    width: 40,
    height: 39,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.headerBorder,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  /* .page-title{padding:10px 16px 7px;font-size:13px;font-weight:800;color:#68737d} */
  pageTitleRow: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: { fontSize: 13, fontWeight: 800, color: C.grey },
  pageTitleCount: { fontSize: 13, fontWeight: 500, color: C.searchPlaceholder },

  /* .card{background:#fff;border:1px solid #e7ebee;border-radius:20px;padding:13px 12px 11px;margin:0 0 12px;box-shadow:0 3px 12px #1b2a3810} */
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 11,
    marginBottom: 12,
    shadowColor: '#1b2a38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardAccepted: { borderColor: C.currentLocBorder },
  cardHighlighted: { borderColor: C.amber, borderWidth: 2 },

  /* Compact 9:16 scale — image/title/meta share one proportional scale */
  cardTop: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 88,
  },
  serviceImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: C.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    flexShrink: 0,
  },
  titleWrap: { flex: 1, minWidth: 0, paddingTop: 2 },
  requestTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '800',
    color: C.dark,
    letterSpacing: -0.3,
    marginBottom: 5,
  },
  category: { fontSize: 12, color: C.grey, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11.5, color: C.dark },
  metaBar: { height: 15, width: 1, backgroundColor: C.radioBorder, marginHorizontal: 2 },

  interestedBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: C.backBg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#0b5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.11,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 2,
  },
  interestedBadgeText: { fontSize: 10.5, fontWeight: '800', color: C.brand },

  /* .location-bar — 48px row, 13.5px address */
  locationBar: {
    minHeight: 48,
    marginTop: 11,
    backgroundColor: C.backBg,
    borderRadius: 13,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 10,
    paddingRight: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /* .location-bar .pin */
  locationBarPin: { width: 24, height: 26, alignItems: 'center', justifyContent: 'center' },
  address: { fontSize: 13.5, lineHeight: 17, fontWeight: '800', color: C.dark, flex: 1, minWidth: 0 },
  /* .navigate — 34px circle */
  /* .navigate{width:38px;height:38px;border-radius:50%;background:#e0f8e8} */
  navigateBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* .tags — 34px chips */
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9, marginBottom: 9 },
  tag: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: C.selectedBg,
    borderWidth: 1,
    borderColor: C.headerBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#182e24',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tagText: { fontSize: 11.5, fontWeight: '600', color: C.dark },

  /* .card-divider{height:1px;background:#edf0f2;margin:0 0 10px} */
  cardDivider: { height: 1, backgroundColor: C.headerBorder, marginBottom: 10 },

  /* .customer-actions{display:grid;grid-template-columns:minmax(0,1fr) 1px 0.76fr 1.34fr;gap:8px;align-items:center} */
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /* .customer{display:flex;align-items:center;gap:9px;min-width:0;flex:1} */
  customer: { flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    /* ProfileAvatar adds its own row margin — this row spaces with `gap`. */
    marginRight: 0,
  },
  customerInfo: { flex: 1, minWidth: 0 },
  customerName: { fontSize: 13.5, fontWeight: '800', color: C.dark, lineHeight: 16 },
  verticalDivider: { width: 1, height: 36, backgroundColor: C.greyLight },
  /* .action{height:43px;border-radius:12px;font-size:13px;font-weight:800;gap:6px} */
  action: {
    height: 42,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  /* .call{background:#fff;border:1px solid #e0e5e9;color:#111d28} — icon-only, fixed 43x43 */
  actionCall: {
    width: 42,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.greyLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  actionCallDisabled: { backgroundColor: C.field },
  /* .interest{background:linear-gradient(110deg,#079b42,#008b38);border:1px solid #078a3d;color:#fff;flex:1.34} */
  actionInterest: {
    flex: 1.8,
    backgroundColor: C.brand,
    borderWidth: 1,
    borderColor: C.secondary,
    shadowColor: '#008d3a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 2,
  },
  actionTextInterest: { fontSize: 12.5, fontWeight: '800', color: C.onPrimary },

  /* .pro-banner positioning */
  floatingBanner: {
    position: 'absolute',
    left: 13,
    right: 13,
    zIndex: 40,
  },

  /* .sticky-filters */
  stickyFilters: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    shadowColor: '#101820',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 18,
  },

  errorBannerWrap: {
    position: 'absolute',
    top: 8,
    left: 13,
    right: 13,
    zIndex: 30,
  },

  /* .bottom-nav{height:77px;padding:7px 12px 10px;border-top:1px solid #edf0f2;grid 3 columns} */
  bottomNavBarWrap: {
    flexDirection: 'row',
    height: 77,
    paddingTop: 7,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.headerBorder,
    zIndex: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTab: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 4 },
  bottomTabIconWrap: { position: 'relative' },
  /* .tab-count bubble pinned to the tab icon like the approved reference */
  bottomTabIconCount: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: C.mintStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.white,
  },
  bottomTabIconCountText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textAlign: 'center',
    color: C.brand,
  },
  /* .tab.active{color:#087b32;background:#e6faed;border-radius:16px} */
  bottomTabActive: { backgroundColor: C.backBg, borderRadius: 16 },
  bottomTabLabel: { fontSize: 13, fontWeight: 700, color: C.dark },
  bottomTabLabelActive: { color: C.brand },
});

export default SPWorkRequestsScreen;
