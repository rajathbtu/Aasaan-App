import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import SvgIcon from '../assets/icons';
import { colors } from '../theme';
import { getWorkRequest } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo } from '../utils/commonUtils';
import { resolveServiceIconName } from '../utils/serviceIcon';
import ErrorBanner from '../components/ErrorBanner';
import RateAndReviewModal from '../components/RateAndReviewModal';
import EmptyState from '../components/EmptyState';
import ProfileAvatar from '../components/ProfileAvatar';

/**
 * Work Request detail — Interested Service Providers.
 *
 * Implemented 1:1 from Work_Request_Detail_Handoff (index.html + styles.css).
 * The handoff prototype renders a 1024 × 1536 design canvas scaled to the
 * viewport width (`scale = innerWidth / 1024` in app.js); the same
 * proportional scaling is used here for every LAYOUT metric (card sizes,
 * radii, paddings, gaps, artwork, avatars, icon bubbles).
 *
 * Typography uses the app's standard, cross-screen type scale (header 22,
 * card title 19, section heading 19, body 14, meta 13, captions 12.5 — the
 * same values as WorkRequestsScreen / WorkRequestCreatedScreen /
 * BoostRequestScreen) so text size is consistent across the app instead of
 * shrinking with the canvas factor.
 */

type ProviderCard = {
  id: string;
  provider: {
    id: string;
    name: string;
    phoneNumber?: string | null;
    picUrl?: string | null;
    createdAt?: string | null;
    aadhaarVerified?: boolean;
    isOnline?: boolean;
    serviceProviderInfo?: {
      workSinceYear?: number | null;
      birthYear?: number | null;
      gender?: string | null;
      bio?: string | null;
      location?: { lat?: number | null; lng?: number | null };
    };
    providerRating?: {
      average?: number | null;
      count?: number;
    };
  };
  acceptedAt?: string | null;
};

type WorkRequest = {
  id: string;
  status?: string;
  service?: string;
  serviceName?: string | null;
  serviceIcon?: string | null;
  serviceColor?: string | null;
  title?: string | null;
  location?: { name?: string | null; lat?: number; lng?: number };
  locationName?: string | null;
  locationLat?: number;
  locationLng?: number;
  createdAt?: string | null;
  acceptedProviders?: any[];
  phoneConsent?: boolean;
  tags?: string[];
  boosted?: boolean;
};

const SORT_MODES: Array<{ value: 'best' | 'rating' | 'newest'; labelKey: string }> = [
  { value: 'best', labelKey: 'sortBestMatch' },
  { value: 'rating', labelKey: 'sortRating' },
  { value: 'newest', labelKey: 'sortNewest' },
];

/* Handoff palette (styles.css :root) */
const C = {
  green: '#079B60',
  deep: '#07864F',
  ink: '#101A35',
  headingInk: '#080F1D',
  cardInk: '#0B1020',
  muted: '#52617F',
  time: '#4E5A70',
  timeIcon: '#475569',
  sortInk: '#273548',
  placeholder: '#7A879A',
  meta: '#334155',
  actionSmall: '#586477',
  line: '#E1E7EE',
  backBg: '#E2F8EE',
  backIcon: '#081A22',
  statusBg: '#E1F8EB',
  statusText: '#078D4E',
  statusDot: '#08B83F',
  locationIcon: '#078F55',
  boostText: '#C84900',
  boostBorder: '#FFE0B7',
  closeText: '#C31820',
  closeBorder: '#FFD7DA',
  tileBorder: '#DDE5EE',
  metaTileBg: '#E4F8EF',
  verifiedBg: '#00B95D',
  star: '#F5A800',
  onlineDot: '#00B85A',
} as const;

/* Filled star used by the approved design's rating row. */
const FILLED_STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12 1.7 3.1 6.4 7 1-5 5 1.2 7-6.3-3.3L5.7 21l1.2-7-5-5 7-1Z" fill="#F5A800"/></svg>`;

/* Verified badge — green scalloped seal with white check (assets/verified.svg). */
const VERIFIED_BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12 2 2.1 1.4 2.5-.2 1.1 2.3 2.3 1.1-.2 2.5L21 11l-1.2 2.1.2 2.5-2.3 1.1-1.1 2.3-2.5-.2L12 20l-2.1-1.2-2.5.2-1.1-2.3L4 15.6l.2-2.5L3 11l1.2-2.1L4 6.4l2.3-1.1 1.1-2.3 2.5.2Z" fill="#00B95D"/><path d="m8.5 11.5 2.2 2.2 4.8-4.8" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Human membership duration from the provider join date, matching the
 * approved design's "Member for 2.1 yrs" copy. Returns null when the join
 * date is missing/unparseable so callers can fall back to the existing
 * "Joined ..." label — never fake data.
 */
const membershipDuration = (createdAt?: string | null): string | null => {
  if (!createdAt) return null;
  const joined = new Date(createdAt);
  if (!Number.isFinite(joined.getTime())) return null;
  const ms = Date.now() - joined.getTime();
  if (ms <= 0) return null;
  const years = ms / (365.25 * 24 * 3600 * 1000);
  if (years >= 1) return `${years.toFixed(1)} yrs`;
  const months = ms / (30.44 * 24 * 3600 * 1000);
  if (months >= 1) return `${Math.round(months)} mo`;
  return null;
};

const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const timeAgo = buildTimeAgo(t);
  const { width: windowWidth } = useWindowDimensions();
  /* Handoff canvas scale — identical to fitCanvas() in the prototype's app.js.
     Applied to layout metrics only; typography uses the standard app scale. */
  const s = windowWidth / 1024;
  const topPadding = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const [request, setRequest] = useState<WorkRequest | null>(route.params?.request || null);
  const [loadingStage, setLoadingStage] = useState<'initial' | 'details' | 'idle'>(
    route.params?.request ? 'details' : 'initial'
  );
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const [closeVisible, setCloseVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'best' | 'rating' | 'newest'>('best');
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingProviderId, setAcceptingProviderId] = useState<string | null>(null);
  const [acceptedProviderIds, setAcceptedProviderIds] = useState<Set<string>>(new Set());

  const requestId = route.params?.id || route.params?.request?.id;
  const cacheKey = requestId && user?.id ? offlineCacheKey('work-request', user.id, requestId) : null;

  const providers = useMemo(() => {
    const list: ProviderCard[] = (request?.acceptedProviders || []).map((p: any) => ({
      id: String(p.id || p.providerId || p.provider?.id),
      provider: p.provider || {},
      acceptedAt: p.acceptedAt,
    }));
    return list;
  }, [request]);

  const filteredProviders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return providers;
    return providers.filter((p) => String(p.provider.name || '').toLowerCase().includes(q));
  }, [providers, searchQuery]);

  const sortedProviders = useMemo(() => {
    let list = [...filteredProviders];
    if (sortMode === 'rating') {
      list.sort(
        (a, b) =>
          Number(b.provider.providerRating?.average || 0) - Number(a.provider.providerRating?.average || 0)
      );
    } else if (sortMode === 'newest') {
      list.sort(
        (a, b) =>
          new Date(b.provider.createdAt || 0).getTime() - new Date(a.provider.createdAt || 0).getTime()
      );
    }
    return list;
  }, [filteredProviders, sortMode]);

  const serviceName = request?.serviceName || request?.service || t('requestDetails.title');
  const serviceIcon = request?.serviceIcon;
  const serviceColor = request?.serviceColor;
  const serviceIconName = resolveServiceIconName(serviceName);
  const locationName = request?.locationName || request?.location?.name || t('userRequests.locationFallback');
  const status = (request?.status || 'active').toString().toLowerCase();
  const isCompleted = status === 'completed' || status === 'closed';

  const handleBoost = useCallback(() => {
    if (!request) return;
    navigation.navigate('BoostRequest', { request });
  }, [navigation, request]);

  useEffect(() => {
    let isMounted = true;
    const loadRequest = async () => {
      if (!requestId) return;
      if (cacheKey && !route.params?.request) {
        const cached = await readOfflineCache<any>(cacheKey);
        if (cached && isMounted) {
          setRequest(cached as WorkRequest);
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
          setRequest((current: WorkRequest | null) => ({
            ...(current || {}),
            ...data,
            serviceName: data.serviceName || current?.serviceName,
            serviceIcon: data.serviceIcon || current?.serviceIcon,
            serviceColor: data.serviceColor || current?.serviceColor,
          }) as WorkRequest);
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

  const handleRefresh = useCallback(async () => {
    if (!token || !requestId) return;
    setRefreshing(true);
    try {
      const data = await getWorkRequest(token, requestId);
      setRequest((current: WorkRequest | null) => ({
        ...(current || {}),
        ...data,
        serviceName: data.serviceName || current?.serviceName,
      }) as WorkRequest);
      setRequestError(null);
      if (cacheKey) await writeOfflineCache(cacheKey, data);
    } catch (err) {
      setRequestError(err);
    } finally {
      setRefreshing(false);
    }
  }, [token, requestId, cacheKey]);

  const handleAcceptInterest = useCallback(
    (providerId: string) => {
      if (!token || acceptingProviderId === providerId || acceptedProviderIds.has(providerId)) return;
      setAcceptingProviderId(providerId);
      try {
        /*
         * NOTE: There is no dedicated consumer-side "accept provider interest"
         * endpoint in the backend. The providers listed here have already
         * accepted the request (provider-side PUT /work-requests/:id/accept).
         * We record the consumer's selection optimistically and do NOT claim a
         * booking is confirmed until the backend confirms it. Replace this
         * optimistic block with the existing consumer-side accept/select
         * mutation once that endpoint is available.
         */
        setAcceptedProviderIds((prev) => new Set([...prev, providerId]));
      } finally {
        setAcceptingProviderId(null);
      }
    },
    [token, acceptingProviderId, acceptedProviderIds]
  );

  const renderProviderCard = (item: ProviderCard) => {
    const provider = item.provider;
    const name = provider.name || t('requestDetails.Expert');
    const isVerified = provider.aadhaarVerified === true;
    /* Online indicator only when the backend actually supplies presence. */
    const isOnline = provider.isOnline === true;
    const rating = provider.providerRating?.average;
    const reviewCount = provider.providerRating?.count ?? 0;
    const joinedDate = provider.createdAt ? new Date(provider.createdAt) : null;
    const membership = membershipDuration(provider.createdAt);
    const tenureLabel = membership
      ? t('requestDetails.memberFor', { time: membership })
      : joinedDate && Number.isFinite(joinedDate.getTime())
      ? t('requestDetails.membersince', { timeAgo: timeAgo(joinedDate) })
      : t('requestDetails.unavailable');
    /* Rendered only when the backend actually supplies a completed-jobs
       count — the approved design shows it, but it must never be faked. */
    const completedRequests =
      (provider as any).completedRequestsCount ??
      (provider as any).completedJobsCount ??
      (provider as any).requestsCompleted;
    const isAccepted = acceptedProviderIds.has(item.id);
    const isPending = acceptingProviderId === item.id;

    return (
      <View
        key={item.id}
        style={[
          styles.provider,
          {
            minHeight: 160 * s,
            borderRadius: 35 * s,
            paddingVertical: 20 * s,
            paddingHorizontal: 28 * s,
            gap: 27 * s,
          },
        ]}
        accessibilityLabel={`Provider ${name}`}
      >
        <View style={{ width: 122 * s, height: 122 * s, flexShrink: 0 }}>
          <ProfileAvatar picUrl={provider.picUrl || undefined} profileName={name} size={122 * s} />
          {isOnline && (
            <View
              style={[
                styles.onlineDot,
                {
                  left: 91 * s,
                  bottom: 0,
                  width: 28 * s,
                  height: 28 * s,
                  borderRadius: 14 * s,
                  borderWidth: 4 * s,
                },
              ]}
            />
          )}
        </View>
        <View style={styles.providerInfo}>
          <View style={[styles.providerNameRow, { gap: 12 * s, marginBottom: 9 * s }]}>
            <Text style={styles.providerName} numberOfLines={1}>
              {name}
            </Text>
            {isVerified && (
              <SvgXml xml={VERIFIED_BADGE_SVG} width={17} height={17} style={{ flexShrink: 0 }} />
            )}
          </View>
          {reviewCount > 0 && rating != null ? (
            <View style={[styles.rating, { gap: 10 * s, marginBottom: 13 * s }]}>
              <SvgXml xml={FILLED_STAR_SVG} width={16} height={16} />
              <Text style={styles.ratingValue} numberOfLines={1}>
                {rating.toFixed(1)}
              </Text>
              <Text style={styles.ratingCount} numberOfLines={1}>
                ({reviewCount} reviews)
              </Text>
            </View>
          ) : (
            <Text style={[styles.noRatings, { marginBottom: 13 * s }]} numberOfLines={1}>
              {t('requestDetails.noRatings')}
            </Text>
          )}
          <View style={[styles.meta, { gap: 18 * s }]}>
            {typeof completedRequests === 'number' && (
              <>
                <View style={[styles.metaItem, { gap: 7 * s }]}>
                  <View style={styles.metaIconTile}>
                    <SvgIcon name="briefcase" size={13} color={C.green} />
                  </View>
                  <Text style={styles.metaText} numberOfLines={1}>
                    <Text style={styles.metaTextBold}>{completedRequests}</Text>
                    {' Requests Completed'}
                  </Text>
                </View>
                <View style={styles.metaDivider} />
              </>
            )}
            <View style={[styles.metaItem, { gap: 7 * s }]}>
              <View style={styles.metaIconTile}>
                <SvgIcon name="calendar" size={13} color={C.green} />
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {tenureLabel}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleAcceptInterest(item.id)}
          disabled={isPending || isAccepted}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isAccepted ? t('requestDetails.interestAccepted') : t('requestDetails.acceptInterest')}
          accessibilityState={{ disabled: isPending || isAccepted, busy: isPending }}
        >
          <LinearGradient
            colors={[C.green, C.deep]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[
              styles.accept,
              {
                height: 91 * s,
                minWidth: 233 * s,
                borderRadius: 22 * s,
                paddingHorizontal: 23 * s,
                gap: 14 * s,
              },
              isPending && styles.acceptPending,
            ]}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <SvgIcon name="check" size={16} color="#FFFFFF" />
                <Text style={styles.acceptText} numberOfLines={1}>
                  {isAccepted ? t('requestDetails.interestAccepted') : t('requestDetails.acceptInterest')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  if (!request) {
    // While the details are still loading, keep the spinner up instead of
    // briefly flashing "Request not found" (e.g. deep-link from a push or
    // in-app notification, where no cached/request payload exists yet).
    if (loadingStage !== 'idle') {
      return (
        <View style={[styles.container, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color={C.green} />
          <ErrorBanner error={requestError} />
        </View>
      );
    }
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <Text style={styles.emptyText}>{t('requestDetails.notFound')}</Text>
        <ErrorBanner error={requestError} />
      </View>
    );
  }

  const isClosedForDisplay = isCompleted;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Canvas background: linear-gradient(115deg,#F8FBFD 0%,#F5F9FC 52%,#F8FBFD 100%) */}
      <LinearGradient
        colors={['#F8FBFD', '#F5F9FC', '#F8FBFD']}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 60 * s }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          refreshing
            ? <RefreshControl refreshing={true} onRefresh={handleRefresh} tintColor={C.green} />
            : undefined
        }
      >
        {/* header{left:32,top:70,width:950,height:86;display:flex;align-items:center;gap:36} */}
        <View style={[styles.header, { marginHorizontal: 42 * s, marginLeft: 32 * s, marginTop: 8 * s, height: 88 * s, gap: 36 * s }]}>
          <TouchableOpacity
            style={[styles.back, { width: 88 * s, height: 88 * s, borderRadius: 44 * s }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <SvgIcon name="back" size={21} color={C.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('requestDetails.title')}
          </Text>
        </View>

        {/* .request-card{left:31,top:188,width:962,height:393,radius:42,padding:30} */}
        <View
          style={[
            styles.requestCard,
            {
              marginHorizontal: 31 * s,
              marginTop: 32 * s,
              borderRadius: 42 * s,
              padding: 30 * s,
            },
          ]}
        >
          {/* .request-card:after decorative mint wave */}
          <LinearGradient
            colors={['rgba(219,249,237,0)', 'rgba(194,246,222,0.75)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              right: -70 * s,
              top: 100 * s,
              width: 350 * s,
              height: 230 * s,
              borderTopLeftRadius: 126 * s,
              borderBottomLeftRadius: 126 * s,
            }}
            pointerEvents="none"
          />
          <View style={styles.requestTop}>
            {/* .service-art{width:240,height:210,radius:35} */}
            <View style={[styles.serviceArt, { width: 240 * s, height: 210 * s, borderRadius: 35 * s }]}>
              {serviceIcon ? (
                <Image
                  source={{ uri: serviceIcon }}
                  style={styles.serviceArtImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <SvgIcon name={serviceIconName} size={240 * s * 0.45} color={serviceColor || C.green} />
              )}
            </View>
            {/* .request-copy{left:333,top:30} → 62s after the 240s art */}
            <View style={[styles.requestCopy, { marginLeft: 62 * s, flex: 1, minWidth: 0 }]}>
              <Text style={styles.requestTitle} numberOfLines={1}>
                {request?.title || serviceName}
              </Text>
              <Text style={styles.requestCategory} numberOfLines={1}>
                {serviceName}
              </Text>
              <View style={[styles.time, { gap: 17 * s, marginBottom: 20 * s }]}>
                <SvgIcon name="clock" size={15} color={C.timeIcon} />
                <Text style={styles.timeText} numberOfLines={1}>
                  {timeAgo(request.createdAt) || t('common.relative.justNow')}
                </Text>
              </View>
              {/* .status — pill sized to the standard text scale */}
              <View style={[styles.status, isClosedForDisplay && styles.statusClosed]}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isClosedForDisplay ? '#98A2AE' : C.statusDot },
                  ]}
                />
                <Text style={[styles.statusText, { color: isClosedForDisplay ? '#5D687A' : C.statusText }]}>
                  {isClosedForDisplay ? t('userRequests.statusCompleted') : t('requestDetails.statusActive')}
                </Text>
              </View>
            </View>
          </View>

          {/* .location — in flow so the card grows with the standard text */}
          <LinearGradient
            colors={['#E4F8EE', '#DDF7EB']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[
              styles.location,
              {
                marginTop: 15 * s,
                minHeight: 98 * s,
                borderRadius: 25 * s,
                paddingHorizontal: 39 * s,
                paddingVertical: 8,
                gap: 37 * s,
              },
            ]}
          >
            <SvgIcon name="location" size={20} color={C.locationIcon} />
            <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">
              {locationName}
            </Text>
          </LinearGradient>
        </View>

        {/* .quick-actions{top:609,height:136,gap:22} */}
        <View style={[styles.quickActions, { marginHorizontal: 31 * s, marginTop: 28 * s, gap: 22 * s }]}>
          {/* .action.boost */}
          <TouchableOpacity
            onPress={handleBoost}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('requestDetails.boost')}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={['#FFF3E2', '#FFF8ED']}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 0.8 }}
              style={[styles.action, styles.actionBoost, { minHeight: 136 * s, borderRadius: 29 * s, paddingHorizontal: 12, gap: 8 }]}
            >
              <View style={[styles.actionIcon, { width: 92 * s, height: 92 * s, borderRadius: 46 * s }]}>
                <SvgIcon name="rocket" size={22} color={C.boostText} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{t('requestDetails.boost')}</Text>
                <Text style={styles.actionSubtitle} numberOfLines={2}>
                  Get more responses faster
                </Text>
              </View>
              <Text style={[styles.actionChevron, { color: C.boostText }]}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
          {/* .action.close */}
          <TouchableOpacity
            onPress={() => setCloseVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('requestDetails.close')}
            disabled={isClosedForDisplay}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={['#FFF0F1', '#FFF6F6']}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 0.8 }}
              style={[styles.action, styles.actionClose, { minHeight: 136 * s, borderRadius: 29 * s, paddingHorizontal: 12, gap: 8 }]}
            >
              <View style={[styles.actionIcon, { width: 92 * s, height: 92 * s, borderRadius: 46 * s }]}>
                <SvgIcon name="close-circle" size={22} color={C.closeText} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{t('requestDetails.close')}</Text>
                <Text style={styles.actionSubtitle} numberOfLines={2}>
                  Mark this request as completed
                </Text>
              </View>
              <Text style={[styles.actionChevron, { color: C.closeText }]}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* .providers{left:32,top:790,width:960} */}
        <View style={[styles.providers, { marginHorizontal: 32 * s, marginTop: 45 * s }]}>
          <Text style={styles.providersTitle} numberOfLines={2}>
            {t('requestDetails.interestedProviders', { count: providers.length })}
          </Text>
          <Text style={styles.sectionSubtitle} numberOfLines={2}>
            {t('requestDetails.interestedProvidersSubtitle')}
          </Text>

          {/* .tools — standard field height/typography like the other screens */}
          <View style={[styles.tools, { height: 46, gap: 10, marginBottom: 14 * s }]}>
            <View
              style={[
                styles.search,
                { height: 46, borderRadius: 23, paddingHorizontal: 14, gap: 8 },
              ]}
            >
              <SvgIcon name="search" size={18} color={C.sortInk} />
              <TextInput
                style={[styles.searchInput, { height: 44 }]}
                placeholder={t('requestDetails.searchProvidersPlaceholder')}
                placeholderTextColor={C.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                spellCheck={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.sort, { height: 46, borderRadius: 23, gap: 7, paddingHorizontal: 12 }]}
              onPress={() => {
                const modes: Array<'best' | 'rating' | 'newest'> = ['best', 'rating', 'newest'];
                const next = modes[(modes.indexOf(sortMode) + 1) % modes.length];
                setSortMode(next);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('requestDetails.sortTitle')}
            >
              <SvgIcon name="sort" size={16} color={C.sortInk} />
              <Text style={styles.sortLabel} numberOfLines={1}>
                {t(
                  'requestDetails.sortLabel',
                  {
                    mode: t(
                      'requestDetails.' +
                        (SORT_MODES.find((m) => m.value === sortMode)?.labelKey || 'sortBestMatch')
                    ),
                  }
                )}
              </Text>
              <SvgIcon name="chevron-down" size={15} color={C.sortInk} />
            </TouchableOpacity>
          </View>

          {/* .provider-list{gap:18} */}
          <View style={{ gap: 18 * s }}>
            {sortedProviders.length === 0 ? (
              <EmptyState
                icon="briefcase"
                title={t('userRequests.noResponsesTitle')}
                description={t('userRequests.noResponsesSubtitle')}
              />
            ) : (
              sortedProviders.map(renderProviderCard)
            )}
          </View>
        </View>
      </ScrollView>

      <RateAndReviewModal
        visible={closeVisible}
        request={request}
        token={token}
        onClose={() => setCloseVisible(false)}
        onSuccess={(closedRequest) => {
          setCloseVisible(false);
          setRequest(closedRequest);
        }}
      />
      {!closeVisible && <ErrorBanner error={requestError} />}
    </View>
  );
};

/* Standard type scale — consistent with WorkRequestsScreen,
   WorkRequestCreatedScreen and BoostRequestScreen. */
const T = {
  headerTitle: 22,
  requestTitle: 19,
  category: 14,
  time: 13,
  status: 12.5,
  locationLabel: 12.5,
  locationAddress: 15,
  actionTitle: 16,
  actionSubtitle: 12.5,
  sectionTitle: 19,
  sectionSubtitle: 14,
  searchInput: 15,
  sortLabel: 13.5,
  providerName: 16.5,
  ratingValue: 14.5,
  ratingCount: 13,
  meta: 13,
  accept: 14,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  emptyText: {
    color: C.ink,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 16,
    fontFamily: 'Inter',
  },
  scrollView: {
    flex: 1,
  },
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    backgroundColor: C.backBg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: T.headerTitle,
    lineHeight: 27,
    letterSpacing: -0.5,
    fontFamily: 'Inter-Bold',
    color: C.headingInk,
    flexShrink: 1,
  },
  /* Request card */
  requestCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    overflow: 'hidden',
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 12.5,
    elevation: 6,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  requestCopy: {
    alignItems: 'flex-start',
  },
  serviceArt: {
    backgroundColor: C.statusBg,
    overflow: 'hidden',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceArtImage: {
    width: '100%',
    height: '100%',
  },
  requestTitle: {
    fontSize: T.requestTitle,
    lineHeight: 23,
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
    color: C.cardInk,
    marginBottom: 4,
  },
  requestCategory: {
    fontSize: T.category,
    lineHeight: 18,
    fontFamily: 'Inter',
    color: C.time,
    marginBottom: 7,
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: T.time,
    fontFamily: 'Inter',
    color: C.time,
    flexShrink: 1,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.statusBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusClosed: {
    backgroundColor: '#EEF1F4',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.statusDot,
  },
  statusText: {
    fontSize: T.status,
    fontFamily: 'Inter-Bold',
    color: C.statusText,
  },
  /* Location panel */
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationAddress: {
    flex: 1,
    minWidth: 0,
    fontSize: T.locationAddress,
    lineHeight: 20,
    fontFamily: 'Inter-Bold',
    color: C.cardInk,
  },
  /* Quick actions */
  quickActions: {
    flexDirection: 'row',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingVertical: 10,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 7,
    elevation: 4,
  },
  actionBoost: {
    borderColor: C.boostBorder,
  },
  actionClose: {
    borderColor: C.closeBorder,
  },
  actionIcon: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  actionTitle: {
    fontSize: 15.5,
    lineHeight: 20,
    fontFamily: 'Inter-Bold',
  },
  actionSubtitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: 'Inter',
    color: C.actionSmall,
  },
  actionChevron: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  /* Providers section */
  providers: {},
  providersTitle: {
    fontSize: T.sectionTitle,
    lineHeight: 24,
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
    color: C.headingInk,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: T.sectionSubtitle,
    lineHeight: 18,
    fontFamily: 'Inter',
    color: C.muted,
    marginBottom: 11,
  },
  /* Search + sort */
  tools: {
    flexDirection: 'row',
  },
  search: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.tileBorder,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontFamily: 'Inter',
    color: C.sortInk,
    padding: 0,
  },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.tileBorder,
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sortLabel: {
    fontSize: 14.5,
    fontFamily: 'Inter-Bold',
    color: C.sortInk,
    flexShrink: 1,
  },
  /* Provider cards — geometry is applied inline with the canvas scale s */
  provider: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 9.5,
    elevation: 4,
    overflow: 'visible',
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: C.onlineDot,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  providerInfo: {
    flex: 1,
    minWidth: 0,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    fontSize: T.providerName,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
    color: C.headingInk,
    flexShrink: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: T.ratingValue,
    fontFamily: 'Inter-Bold',
    color: C.ink,
  },
  ratingCount: {
    fontSize: T.ratingCount,
    fontFamily: 'Inter',
    color: C.muted,
  },
  noRatings: {
    fontSize: T.ratingCount,
    fontFamily: 'Inter',
    color: C.muted,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  metaIconTile: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.metaTileBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metaText: {
    fontSize: T.meta,
    fontFamily: 'Inter',
    color: C.meta,
    flexShrink: 1,
  },
  metaTextBold: {
    fontFamily: 'Inter-Bold',
    color: C.meta,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: C.line,
    flexShrink: 0,
  },
  accept: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  acceptPending: {
    opacity: 0.85,
  },
  acceptText: {
    fontSize: T.accept,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});

export default WorkRequestDetailsScreen;
