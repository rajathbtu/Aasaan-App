import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
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
import { getWorkRequest } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo } from '../utils/commonUtils';
import { resolveServiceIconName } from '../utils/serviceIcon';
import ErrorBanner from '../components/ErrorBanner';
import RateAndReviewModal from '../components/RateAndReviewModal';
import EmptyState from '../components/EmptyState';
import ProfileAvatar from '../components/ProfileAvatar';
import { spacing } from '../theme';
import type { ConsumerPalette } from '../theme/palette';

/**
 * Work Request detail — Interested Service Providers.
 *
 * Implemented 1:1 from the corrected Work_Request_Detail_Handoff
 * (approved_final_design.png + index.html + styles.css). The handoff
 * prototype renders a 941 px-wide design canvas; the same proportional
 * scaling (`s = windowWidth / 941`) is used here for every LAYOUT metric
 * (top bar, card sizes, radii, paddings, gaps, artwork, avatars, tiles).
 *
 * Typography uses the app's standard, cross-screen type scale (header 22,
 * card title 19, section heading 19, body 14, meta 13, captions 12.5 — the
 * same values as WorkRequestsScreen / WorkRequestCreatedScreen /
 * BoostRequestScreen) so text size stays consistent across the app.
 *
 * Structure: standard light top bar (mint back circle, bold ink title,
 * overflow menu — consistent with the other consumer pages), white request
 * card with Active pill + plain location meta row, white action tiles
 * (Edit / Share / Mark Completed — the header ⋮ opens a dropdown with
 * Close Request / Share / Edit / Mark Completed; Boost only in the
 * bottom banner), Interested Service Providers
 * heading with count badge,
 * horizontal filter chips (All / Highest Rated / Nearest / Fast Response,
 * shown only once providers respond), white provider list with Accept
 * Interest + View Profile, and the mint boost banner (same container as
 * the WorkRequestCreatedScreen boost banner).
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

type FilterKey = 'all' | 'rating' | 'nearest' | 'fast';

const FILTERS: Array<{ value: FilterKey; labelKey: string }> = [
  { value: 'all', labelKey: 'filterAll' },
  { value: 'rating', labelKey: 'filterTopRated' },
  { value: 'nearest', labelKey: 'filterNearest' },
  { value: 'fast', labelKey: 'filterFastResponse' },
];

/* Filled star used by the approved design's rating row. */
const filledStarSvg = (C: ConsumerPalette) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12 1.7 3.1 6.4 7 1-5 5 1.2 7-6.3-3.3L5.7 21l1.2-7-5-5 7-1Z" fill="${C.star}"/></svg>`;

/* Verified badge — green scalloped seal with white check (assets/verified.svg). */
const verifiedBadgeSvg = (C: ConsumerPalette) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12 2 2.1 1.4 2.5-.2 1.1 2.3 2.3 1.1-.2 2.5L21 11l-1.2 2.1.2 2.5-2.3 1.1-1.1 2.3-2.5-.2L12 20l-2.1-1.2-2.5.2-1.1-2.3L4 15.6l.2-2.5L3 11l1.2-2.1L4 6.4l2.3-1.1 1.1-2.3 2.5.2Z" fill="${C.verifiedBg}"/><path d="m8.5 11.5 2.2 2.2 4.8-4.8" fill="none" stroke="${C.onPrimary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* Top-bar overflow glyph — three ink dots (assets/more.svg). */
const moreSvg = (C: ConsumerPalette) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="${C.ink}"/><circle cx="12" cy="12" r="2" fill="${C.ink}"/><circle cx="12" cy="19" r="2" fill="${C.ink}"/></svg>`;

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

/* Great-circle distance in km — used only by the "Nearest" filter. */
const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const { t } = useI18n();
  const { consumer: C, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const timeAgo = buildTimeAgo(t);
  const { width: windowWidth } = useWindowDimensions();
  /* Handoff canvas scale — layout metrics only; typography uses the app scale. */
  const s = windowWidth / 941;
  const topPadding = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const [request, setRequest] = useState<WorkRequest | null>(route.params?.request || null);
  const [loadingStage, setLoadingStage] = useState<'initial' | 'details' | 'idle'>(
    route.params?.request ? 'details' : 'initial'
  );
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const [closeVisible, setCloseVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const moreButtonRef = useRef<any>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingProviderId, setAcceptingProviderId] = useState<string | null>(null);
  const [acceptedProviderIds, setAcceptedProviderIds] = useState<Set<string>>(new Set());
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [titleOverflow, setTitleOverflow] = useState(false);

  const requestId = route.params?.id || route.params?.request?.id;
  const cacheKey = requestId && user?.id ? offlineCacheKey('work-request', user.id, requestId) : null;

  /* Status-bar icons follow the theme: dark icons on the light page in light
     mode, light icons on the dark page in dark mode. */
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
  }, [isDark]);

  /* Collapse the title again when a different request is opened. */
  useEffect(() => {
    setTitleExpanded(false);
    setTitleOverflow(false);
  }, [requestId]);

  const providers = useMemo(() => {
    const list: ProviderCard[] = (request?.acceptedProviders || []).map((p: any) => ({
      id: String(p.id || p.providerId || p.provider?.id),
      provider: p.provider || {},
      acceptedAt: p.acceptedAt,
    }));
    return list;
  }, [request]);

  /* Response-time estimate is rendered only when the API actually supplies
     one — the approved design's "Responds in ~15 mins" pill must never be
     faked. Accepts a few possible field names so it lights up as soon as
     the backend starts sending it. */
  const responseMinutesOf = useCallback((p: ProviderCard): number | null => {
    const raw =
      (p.provider as any).responseTimeMinutes ??
      (p.provider as any).avgResponseMinutes ??
      (p.provider as any).responseMinutes;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, []);

  const requestCoords = useMemo(() => {
    const lat = request?.locationLat ?? request?.location?.lat;
    const lng = request?.locationLng ?? request?.location?.lng;
    return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
  }, [request]);

  const sortedProviders = useMemo(() => {
    let list = [...providers];
    if (filter === 'rating') {
      list.sort(
        (a, b) =>
          Number(b.provider.providerRating?.average || 0) - Number(a.provider.providerRating?.average || 0)
      );
    } else if (filter === 'nearest') {
      if (requestCoords) {
        const dist = (p: ProviderCard) => {
          const loc = p.provider.serviceProviderInfo?.location;
          if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return Number.POSITIVE_INFINITY;
          return distanceKm(requestCoords.lat, requestCoords.lng, loc.lat, loc.lng);
        };
        list.sort((a, b) => dist(a) - dist(b));
      }
    } else if (filter === 'fast') {
      /* Sort by response estimate when the API supplies one; otherwise the
         list keeps the backend order instead of inventing data. */
      if (list.some((p) => responseMinutesOf(p) != null)) {
        list.sort((a, b) => (responseMinutesOf(a) ?? 999) - (responseMinutesOf(b) ?? 999));
      }
    }
    return list;
  }, [providers, filter, requestCoords, responseMinutesOf]);

  const serviceName = request?.serviceName || request?.service || t('requestDetails.title');
  /* Backend supplies serviceIcon as a Material icon NAME (e.g. "construct"),
     not an image URL — only treat http(s)/data values as images. */
  const serviceIconUrl =
    typeof request?.serviceIcon === 'string' && /^(https?:|data:)/.test(request.serviceIcon)
      ? request.serviceIcon
      : null;
  const serviceIconName = resolveServiceIconName(serviceName);
  const locationName = request?.locationName || request?.location?.name || t('userRequests.locationFallback');
  const status = (request?.status || 'active').toString().toLowerCase();
  const isCompleted = status === 'completed' || status === 'closed';

  const handleBoost = useCallback(() => {
    if (!request) return;
    navigation.navigate('BoostRequest', { request });
  }, [navigation, request]);

  const handleShare = useCallback(() => {
    const label = request?.title || serviceName;
    Share.share({ message: `${label} - ${locationName}` }).catch(() => {
      // sharing cancelled or failed — silent no-op
    });
  }, [request?.title, serviceName, locationName]);

  /* No request-edit route or backend edit endpoint exists yet; the tile is
     part of the approved design and stays honest until the flow ships. */
  const handleEdit = useCallback(() => {
    if (isCompleted) return;
    Alert.alert(t('requestDetails.editTitle'), t('requestDetails.editUnavailable'), [
      { text: t('requestDetails.ok') },
    ]);
  }, [isCompleted, t]);

  /* Header option button — opens an anchored dropdown menu with the less
     common actions (Close Request / Share / Edit / Mark Completed). */
  const handleMore = useCallback(() => {
    moreButtonRef.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
      setMenuPos({ x: x + w, y: y + h });
      setMenuVisible(true);
    });
  }, []);

  const toggleProviderProfile = useCallback((id: string) => {
    setExpandedProviderId((current) => (current === id ? null : id));
  }, []);

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
    const responseMinutes = responseMinutesOf(item);
    const responseTone =
      responseMinutes == null
        ? null
        : responseMinutes < 20
        ? { bg: C.respGreenBg, text: C.respGreenText }
        : responseMinutes < 45
        ? { bg: C.respBlueBg, text: C.respBlueText }
        : { bg: C.respPurpleBg, text: C.respPurpleText };
    const isAccepted = acceptedProviderIds.has(item.id);
    const isPending = acceptingProviderId === item.id;
    const isExpanded = expandedProviderId === item.id;
    const workSinceYear = provider.serviceProviderInfo?.workSinceYear;
    const yearsOfWork = typeof workSinceYear === 'number' && workSinceYear > 0 ? new Date().getFullYear() - workSinceYear : null;
    const birthYear = provider.serviceProviderInfo?.birthYear;
    const age = typeof birthYear === 'number' && birthYear > 0 ? new Date().getFullYear() - birthYear : null;
    const genderRaw = (provider.serviceProviderInfo?.gender || '').toString().toLowerCase();
    const genderLabel =
      genderRaw === 'male'
        ? t('requestDetails.genderMale')
        : genderRaw === 'female'
        ? t('requestDetails.genderFemale')
        : genderRaw === 'transgender' || genderRaw === 'other'
        ? t('requestDetails.genderTransgender')
        : null;
    const bio = provider.serviceProviderInfo?.bio;
    const providerLoc = provider.serviceProviderInfo?.location;
    const distance =
      requestCoords && typeof providerLoc?.lat === 'number' && typeof providerLoc?.lng === 'number'
        ? distanceKm(requestCoords.lat, requestCoords.lng, providerLoc.lat, providerLoc.lng)
        : null;

    return (
      <View
        key={item.id}
        style={[styles.provider, { paddingVertical: 16 * s, gap: 14 * s }]}
        accessibilityLabel={`Provider ${name}`}
      >
        <View style={{ width: 84 * s, flexShrink: 0 }}>
          <ProfileAvatar picUrl={provider.picUrl || undefined} profileName={name} size={84 * s} />
          {isOnline && (
            <View
              style={[
                styles.onlineDot,
                {
                  left: 58 * s,
                  bottom: 0,
                  width: Math.max(20 * s, 12),
                  height: Math.max(20 * s, 12),
                  borderRadius: Math.max(10 * s, 6),
                  borderWidth: 3 * s,
                },
              ]}
            />
          )}
        </View>
        <View style={styles.providerInfo}>
          <View style={[styles.providerNameRow, { gap: 6 * s, marginBottom: 5 * s }]}>
            <Text style={styles.providerName} numberOfLines={1}>
              {name}
            </Text>
            {isVerified && (
              <SvgXml xml={verifiedBadgeSvg(C)} width={Math.max(19 * s, 14)} height={Math.max(19 * s, 14)} style={{ flexShrink: 0 }} />
            )}
          </View>
          {reviewCount > 0 && rating != null ? (
            <View style={[styles.rating, { gap: 6 * s, marginBottom: 6 * s }]}>
              <SvgXml xml={filledStarSvg(C)} width={Math.max(18 * s, 13)} height={Math.max(18 * s, 13)} />
              <Text style={styles.ratingValue} numberOfLines={1}>
                {rating.toFixed(1)}
              </Text>
              <Text style={styles.ratingCount} numberOfLines={1}>
                ({reviewCount} reviews)
              </Text>
            </View>
          ) : (
            <Text style={[styles.noRatings, { marginBottom: 6 * s }]} numberOfLines={1}>
              {t('requestDetails.noRatings')}
            </Text>
          )}
          <View style={[styles.meta, { gap: 10 * s }]}>
            {typeof completedRequests === 'number' && (
              <View style={[styles.metaItem, { gap: 5 * s }]}>
                <SvgIcon name="briefcase" size={Math.max(17 * s, 12)} color={C.metaInk} />
                <Text style={styles.metaText} numberOfLines={1}>
                  <Text style={styles.metaTextBold}>{completedRequests}</Text>
                  {' completed'}
                </Text>
              </View>
            )}
            <View style={[styles.metaItem, { gap: 5 * s }]}>
              <SvgIcon name="calendar" size={Math.max(17 * s, 12)} color={C.metaInk} />
              <Text style={styles.metaText} numberOfLines={1}>
                {tenureLabel}
              </Text>
            </View>
          </View>
          {responseTone && (
            <View
              style={[
                styles.response,
                {
                  backgroundColor: responseTone.bg,
                  marginTop: 8 * s,
                  paddingHorizontal: 9 * s,
                  paddingVertical: 5 * s,
                  gap: 6 * s,
                },
              ]}
            >
              <SvgIcon name="clock" size={Math.max(14 * s, 10)} color={responseTone.text} />
              <Text style={[styles.responseText, { color: responseTone.text }]} numberOfLines={1}>
                {t('requestDetails.respondsIn', { mins: responseMinutes as number })}
              </Text>
            </View>
          )}
          {isExpanded && (
            <View style={[styles.profileDetails, { marginTop: 8 * s, gap: 3 * s }]}>
              {!!bio && <Text style={styles.profileBio}>{bio}</Text>}
              {yearsOfWork != null && (
                <Text style={styles.profileDetailText}>{t('requestDetails.workExp', { years: yearsOfWork })}</Text>
              )}
              {age != null && (
                <Text style={styles.profileDetailText}>{t('requestDetails.age', { age })}</Text>
              )}
              {!!genderLabel && <Text style={styles.profileDetailText}>{genderLabel}</Text>}
              {distance != null && (
                <Text style={styles.profileDetailText}>
                  {distance < 1
                    ? t('requestDetails.nearYou')
                    : t('requestDetails.distanceKm', { distance: distance.toFixed(1) })}
                </Text>
              )}
            </View>
          )}
        </View>
        <View style={[styles.providerButtons, { width: Math.max(160 * s, 124), gap: 7 * s }]}>
          <TouchableOpacity
            onPress={() => handleAcceptInterest(item.id)}
            disabled={isPending || isAccepted}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isAccepted ? t('requestDetails.interestAccepted') : t('requestDetails.acceptInterest')}
            accessibilityState={{ disabled: isPending || isAccepted, busy: isPending }}
          >
            <LinearGradient
              colors={isAccepted ? [C.acceptedBg, C.acceptedBg] : [C.acceptStart, C.acceptEnd]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[
                styles.accept,
                {
                  minHeight: Math.max(39 * s, 34),
                  borderRadius: 22 * s,
                  paddingHorizontal: 8 * s,
                  gap: 6 * s,
                },
                isPending && styles.acceptPending,
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={C.onPrimary} />
              ) : (
                <>
                  <SvgIcon
                    name="check"
                    size={Math.max(16 * s, 11)}
                    color={isAccepted ? C.acceptedText : C.onPrimary}
                  />
                  <Text
                    style={[styles.acceptText, isAccepted && { color: C.acceptedText }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {isAccepted ? t('requestDetails.interestAccepted') : t('requestDetails.acceptInterest')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggleProviderProfile(item.id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('requestDetails.viewProfile')}
            style={[
              styles.profileButton,
              { minHeight: Math.max(39 * s, 34), borderRadius: 22 * s, paddingHorizontal: 8 * s },
            ]}
          >
            <Text
              style={styles.profileButtonText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {isExpanded ? t('requestDetails.hideProfile') : t('requestDetails.viewProfile')}
            </Text>
          </TouchableOpacity>
        </View>
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
          <ActivityIndicator size="large" color={C.deepGreen} />
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

  return (
    <View style={styles.container}>
      {/* Page background: was linear-gradient(180deg,#F4F7FB 0%,#F8FBFD 100%) — the stops
          are sub-perceptually different, so both map to the family's page token. */}
      <LinearGradient
        colors={[C.page, C.page]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Standard light top bar — fixed above the scroll (so it never slides
          under the status bar), same height as the shared Header on
          ProfileScreen: safe-area inset + 60pt row. */}
      <View
        style={[
          styles.topbar,
          { paddingTop: topPadding + spacing.xs, paddingHorizontal: 28 * s, gap: 16 * s },
        ]}
      >
        <TouchableOpacity
          style={styles.topBack}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <SvgIcon name="back" size={Math.max(25 * s, 20)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {t('requestDetails.title')}
        </Text>
        <View ref={moreButtonRef} collapsable={false}>
          <TouchableOpacity
            style={styles.topOption}
            onPress={handleMore}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('requestDetails.moreActions')}
          >
            <SvgXml xml={moreSvg(C)} width={Math.max(25 * s, 20)} height={Math.max(25 * s, 20)} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 24 * s }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          refreshing
            ? <RefreshControl refreshing={true} onRefresh={handleRefresh} tintColor={C.deepGreen} />
            : undefined
        }
      >
        <View style={{ paddingHorizontal: 22 * s }}>
          {/* .request-card */}
          <View
            style={[
              styles.requestCard,
              { marginTop: 18 * s, borderRadius: 28 * s, padding: 22 * s, gap: 22 * s },
            ]}
          >
            {/* Decorative translucent mint wash behind the service art — kept as
                rgba literals: an alpha-blended glow has no palette token. */}
            <LinearGradient
              colors={['rgba(218,250,237,0.04)', 'rgba(166,242,213,0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                right: -120 * s,
                top: 100 * s,
                width: 380 * s,
                height: 160 * s,
                borderRadius: 190 * s,
                transform: [{ rotate: '-24deg' }],
              }}
              pointerEvents="none"
            />
            <View style={[styles.serviceImage, { width: 190 * s, height: 190 * s, borderRadius: 24 * s }]}>
              {serviceIconUrl ? (
                <Image
                  source={{ uri: serviceIconUrl }}
                  style={styles.serviceImageArt}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <SvgIcon
                  name={serviceIconName}
                  size={190 * s * 0.42}
                  color={request.serviceColor || C.deepGreen}
                />
              )}
            </View>
            <View style={styles.requestContent}>
              <View style={[styles.status, isCompleted && styles.statusClosed]}>
                <View style={[styles.statusDot, isCompleted && { backgroundColor: C.radioIdle }]} />
                <Text style={[styles.statusText, isCompleted && { color: C.cardMeta }]}>
                  {isCompleted ? t('userRequests.statusCompleted') : t('requestDetails.statusActive')}
                </Text>
              </View>
              {/* Hidden measurer: lays the title out unconstrained (absolute,
                  invisible) to detect whether it exceeds two lines at this
                  width; the visible title then offers Show more / Show less. */}
              <Text
                style={[styles.requestTitle, styles.titleMeasurer]}
                onTextLayout={(e) => {
                  const overflowing = (e.nativeEvent.lines?.length ?? 0) > 2;
                  setTitleOverflow((prev) => (prev === overflowing ? prev : overflowing));
                }}
              >
                {request.title || serviceName}
              </Text>
              <Text
                style={[styles.requestTitle, { marginTop: 10 * s }]}
                numberOfLines={titleExpanded ? undefined : 2}
              >
                {request.title || serviceName}
              </Text>
              {titleOverflow && (
                <TouchableOpacity
                  onPress={() => setTitleExpanded((v) => !v)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={
                    titleExpanded ? t('requestDetails.showLess') : t('requestDetails.showMore')
                  }
                  style={styles.titleToggle}
                >
                  <Text style={styles.titleToggleText}>
                    {titleExpanded ? t('requestDetails.showLess') : t('requestDetails.showMore')}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.requestCategory} numberOfLines={2}>
                {serviceName}
              </Text>
              <View style={[styles.time, { gap: 8 * s, marginBottom: 13 * s }]}>
                <SvgIcon name="clock" size={Math.max(19 * s, 13)} color={C.muted} />
                <Text style={styles.timeText} numberOfLines={1}>
                  {timeAgo(request.createdAt) || t('common.relative.justNow')}
                </Text>
              </View>
              <View style={[styles.location, { gap: 8 * s }]}>
                <SvgIcon name="location" size={Math.max(19 * s, 13)} color={C.muted} />
                <Text style={styles.timeText} numberOfLines={1} ellipsizeMode="tail">
                  {locationName}
                </Text>
              </View>
            </View>
          </View>

          {/* .action-grid — Edit / Share / Mark Completed, using the same
              container, icon-tile and label styling as the BoostRequestScreen
              benefit row (Top Placement / Higher Visibility / Urgent Badge):
              mint 42pt icon tiles, 20pt primary icons, 13pt bold labels and
              hairline dividers. Boost lives only in the banner below. */}
          <View style={[styles.actionGrid, { marginTop: 18 * s, marginBottom: 28 * s }]}>
            <TouchableOpacity
              onPress={handleEdit}
              disabled={isCompleted}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('requestDetails.editTitle')}
              style={[styles.action, isCompleted && { opacity: 0.5 }]}
            >
              <View style={styles.actionIconTile}>
                <SvgIcon name="sa-edit" size={20} color={C.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {t('requestDetails.editTitle').replace(' ', '\n')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('requestDetails.shareRequest')}
              style={styles.action}
            >
              <View style={styles.actionIconTile}>
                <SvgIcon name="share" size={20} color={C.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {t('requestDetails.shareRequest').replace(' ', '\n')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              onPress={() => setCloseVisible(true)}
              disabled={isCompleted}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('requestDetails.markCompleted')}
              style={[styles.action, isCompleted && { opacity: 0.5 }]}
            >
              <View style={styles.actionIconTile}>
                <SvgIcon name="check" size={20} color={C.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {t('requestDetails.markCompleted').replace(' ', '\n')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* .providers */}
          <View style={[styles.providers, { borderRadius: 24 * s, paddingTop: 12 * s, paddingBottom: 6 * s }]}>
            <View style={{ paddingHorizontal: 10 * s }}>
              <View style={[styles.providersTitleRow, { marginBottom: 7 * s }]}>
                <Text style={styles.providersTitle} numberOfLines={1}>
                  {t('requestDetails.interestedProvidersTitle')}
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {t('requestDetails.interestedProvidersSubtitle')}
              </Text>
            </View>

            {/* .filter-row — horizontal chips; hidden until providers respond,
                filters are meaningless on an empty list */}
            {providers.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 9 * s, paddingHorizontal: 8 * s, paddingBottom: 14 * s }}
                style={{ flexGrow: 0 }}
              >
                {FILTERS.map((item) => {
                  const isActive = filter === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setFilter(item.value)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      style={[
                        styles.filter,
                        {
                          paddingHorizontal: Math.max(16 * s, 12),
                          paddingVertical: Math.max(10 * s, 7),
                          borderRadius: 25 * s,
                        },
                        isActive && styles.filterActive,
                      ]}
                    >
                      <Text
                        style={[styles.filterText, isActive && styles.filterTextActive]}
                        numberOfLines={1}
                      >
                        {t(`requestDetails.${item.labelKey}`, { count: providers.length })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={[styles.providerList, { borderRadius: 23 * s, paddingHorizontal: 14 * s }]}>
              {sortedProviders.length === 0 ? (
                <EmptyState
                  icon="briefcase"
                  title={t('userRequests.noResponsesTitle')}
                  description={t('userRequests.noResponsesSubtitle')}
                  actionLabel={t('requestDetails.boost')}
                  onAction={handleBoost}
                />
              ) : (
                sortedProviders.map((item, index) => (
                  <View key={item.id} style={index > 0 ? styles.providerDivider : undefined}>
                    {renderProviderCard(item)}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Boost banner — same container as WorkRequestCreatedScreen: mint
              gradient, approved rocket artwork, copy + Boost button stacked */}
          {/* Mint gradient banner — mapped to the family's heroMint pair
              (was #DDF8EF → #E7FAF4, sub-perceptual shift). */}
          <LinearGradient
            colors={[C.heroMintStart, C.heroMintMid]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.boostBanner, { borderRadius: 38 * s, marginTop: 30 * s, marginBottom: 20 * s }]}
          >
            <Image
              source={require('../assets/images/boost_rocket_illustration.png')}
              style={[styles.boostArt, { width: 225 * s, height: 165 * s }]}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <View style={styles.boostCopy}>
              <Text style={styles.boostTitle}>{t('createRequest.created.boostTitle')}</Text>
              <Text style={styles.boostBody} numberOfLines={2} ellipsizeMode="tail">
                {t('createRequest.created.boostSubtitle')}
              </Text>
              <TouchableOpacity style={styles.boostCta} onPress={handleBoost} activeOpacity={0.7}>
                <SvgIcon name="bolt" size={14} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={styles.boostCtaText} numberOfLines={1} ellipsizeMode="tail">
                  {t('createRequest.created.boostButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
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
      {/* Header ⋮ dropdown menu — anchored to the button, dismissed by
          tapping anywhere outside. */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.menu,
              { top: menuPos.y + 6, right: Math.max(10, windowWidth - menuPos.x) },
            ]}
          >
            {[
              {
                key: 'close',
                label: t('requestDetails.close'),
                icon: 'close-circle' as const,
                color: C.iconClose,
                disabled: isCompleted,
                onPress: () => setCloseVisible(true),
              },
              {
                key: 'share',
                label: t('requestDetails.shareRequest'),
                icon: 'share' as const,
                color: C.iconShare,
                disabled: false,
                onPress: handleShare,
              },
              {
                key: 'edit',
                label: t('requestDetails.editTitle'),
                icon: 'sa-edit' as const,
                color: C.iconEdit,
                disabled: isCompleted,
                onPress: handleEdit,
              },
              {
                key: 'complete',
                label: t('requestDetails.markCompleted'),
                icon: 'check' as const,
                color: C.deepGreen,
                disabled: isCompleted,
                onPress: () => setCloseVisible(true),
              },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  setMenuVisible(false);
                  item.onPress();
                }}
                disabled={item.disabled}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.menuItem,
                  item.disabled && { opacity: 0.35 },
                  pressed && { backgroundColor: C.profileBg },
                ]}
              >
                <SvgIcon name={item.icon} size={18} color={item.color} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  sectionTitle: 19,
  sectionSubtitle: 14,
  filter: 13.5,
  providerName: 16.5,
  ratingValue: 14.5,
  ratingCount: 13,
  meta: 13,
  response: 11.5,
  accept: 13.5,
  profile: 13.5,
} as const;

const makeStyles = (C: ConsumerPalette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.page,
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
  /* Top bar — standard light header, consistent with the other pages */
  /* Top bar — fixed row: safe-area inset + 4pt + 42pt button + 14pt = the
     same 60pt header row height the shared Header uses on ProfileScreen. */
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
  },
  topbarTitle: {
    flex: 1,
    minWidth: 0,
    color: C.ink,
    fontSize: T.headerTitle,
    lineHeight: 27,
    letterSpacing: -0.5,
    fontFamily: 'Inter-Bold',
  },
  topBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topOption: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /* Header dropdown menu */
  menuBackdrop: {
    flex: 1,
    // Contract rule 9: modal scrims use the family scrim token (was rgba(16,23,43,0.14)).
    backgroundColor: C.scrim,
  },
  menu: {
    position: 'absolute',
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.listBorder,
    paddingVertical: 6,
    minWidth: 200,
    shadowColor: '#203A4D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: C.ink,
    flexShrink: 1,
  },
  /* Request card */
  requestCard: {
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#1A364D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 5,
  },
  serviceImage: {
    backgroundColor: C.mintDeep,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  serviceImageArt: {
    width: '100%',
    height: '100%',
  },
  requestContent: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.statusBg,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  statusClosed: {
    backgroundColor: C.pointsPillBg,
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
  requestTitle: {
    fontSize: T.requestTitle,
    lineHeight: 23,
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
    color: C.ink,
    marginBottom: 4,
  },
  requestCategory: {
    fontSize: T.category,
    lineHeight: 18,
    fontFamily: 'Inter',
    color: C.muted,
    marginBottom: 7,
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: T.time,
    fontFamily: 'Inter',
    color: C.muted,
    flexShrink: 1,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleMeasurer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  titleToggle: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 2,
  },
  titleToggleText: {
    fontSize: 12.5,
    fontFamily: 'Inter-Bold',
    color: C.deepGreen,
  },
  /* Action tiles */
  /* Same look as the BoostRequestScreen benefit items (Top Placement /
     Higher Visibility / Urgent Badge): borderless stacks — mint icon tile
     on top, bold centered label below, hairline divider between items. */
  actionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIconTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.locationBg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: C.cardTitle,
    textAlign: 'center',
  },
  actionDivider: {
    width: 1.5,
    height: 40,
    backgroundColor: C.profileBorder,
    marginHorizontal: 6,
  },
  /* Providers section */
  providers: {
    // Was rgba(255,255,255,0.5): a half-white wash has no dark counterpart;
    // the opaque card token keeps the section readable in dark mode.
    backgroundColor: C.white,
  },
  providersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providersTitle: {
    fontSize: T.sectionTitle,
    lineHeight: 24,
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
    color: C.ink,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: T.sectionSubtitle,
    lineHeight: 19,
    fontFamily: 'Inter',
    color: C.muted,
    marginBottom: 16,
  },
  filter: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.filterBorder,
    shadowColor: '#203A4D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  filterActive: {
    backgroundColor: C.deepGreen,
    borderColor: C.deepGreen,
  },
  filterText: {
    fontSize: T.filter,
    fontFamily: 'Inter-Bold',
    color: C.filterText,
  },
  filterTextActive: {
    color: C.onPrimary,
  },
  providerList: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.listBorder,
    shadowColor: '#203A4D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerDivider: {
    borderTopWidth: 1,
    borderTopColor: C.rowBorder,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: C.onlineDot,
    borderColor: C.white,
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
    lineHeight: 21,
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
    color: C.ink,
    flexShrink: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: T.ratingValue,
    fontFamily: 'Inter-Bold',
    color: C.metaInk,
  },
  ratingCount: {
    fontSize: T.ratingCount,
    fontFamily: 'Inter',
    color: C.muted,
    flexShrink: 1,
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
  metaText: {
    fontSize: T.meta,
    fontFamily: 'Inter',
    color: C.metaInk,
    flexShrink: 1,
  },
  metaTextBold: {
    fontFamily: 'Inter-Bold',
    color: C.metaInk,
  },
  response: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 18,
  },
  responseText: {
    fontSize: T.response,
    fontFamily: 'Inter-Bold',
  },
  profileDetails: {
    alignSelf: 'stretch',
  },
  profileBio: {
    fontSize: T.meta,
    lineHeight: 18,
    fontFamily: 'Inter',
    color: C.muted,
  },
  profileDetailText: {
    fontSize: T.meta,
    lineHeight: 18,
    fontFamily: 'Inter',
    color: C.metaInk,
  },
  providerButtons: {
    flexShrink: 0,
  },
  accept: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptPending: {
    opacity: 0.85,
  },
  acceptText: {
    fontSize: T.accept,
    fontFamily: 'Inter-Bold',
    color: C.onPrimary,
    flexShrink: 1,
  },
  profileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.profileBorder,
    backgroundColor: C.profileBg,
  },
  profileButtonText: {
    fontSize: T.profile,
    fontFamily: 'Inter-Bold',
    color: C.profileText,
  },
  /* Boost banner — same container as WorkRequestCreatedScreen (mint gradient
     card; horizontal margins come from the screen's padded content column) */
  boostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    // 8%-alpha brand-green hairline: kept literal — translucent tint has no token.
    borderColor: 'rgba(10,158,99,0.08)',
  },
  boostArt: {
    alignSelf: 'flex-end',
    flexShrink: 0,
  },
  boostCopy: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1.5,
    borderLeftColor: C.heroMintEnd,
    paddingLeft: 12,
    paddingVertical: 12,
  },
  boostTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: C.primaryDark,
    marginBottom: 3,
  },
  boostBody: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: C.muted,
    lineHeight: 16,
  },
  boostCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    // Was rgba(255,255,255,0.72): see providers note.
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.deepGreen,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 9,
  },
  boostCtaText: {
    fontSize: 12.5,
    fontFamily: 'Inter-Bold',
    color: C.primaryDark,
  },
});

export default WorkRequestDetailsScreen;
