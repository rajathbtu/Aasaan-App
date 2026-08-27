import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as realApi from '../api';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import SafeBottomBanner from '../components/SafeBottomBanner';
import SkeletonLoader from '../components/SkeletonLoader';
import UpgradeProBanner from '../components/UpgradeProBanner';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo } from '../utils/time';

const API = realApi;

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

/**
 * Service provider work requests screen.  Displays available and accepted
 * requests, allows filtering by date or distance, and lets providers
 * accept new requests.  The layout mirrors the provided mockup with a
 * header, segmented control, filter chips, stylised cards and a
 * promotional banner.
 */
const SPWorkRequestsScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'accepted'>('all');
  const [filter, setFilter] = useState<'all' | 'today' | 'within3'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const [showProBanner, setShowProBanner] = useState(true);
  const notificationRequestId = route.params?.highlightedRequestId as string | undefined;
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(
    notificationRequestId || null);
  const listRef = useRef<FlatList<any>>(null);
  const userId = user?.id;
  const requestsCacheKey = userId ? offlineCacheKey('provider-requests', userId) : null;

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
      const list = await API.listWorkRequests(token);
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
   * Computes the distance between two latitude/longitude pairs using the
   * haversine formula.  Returns the distance in kilometres.
   */
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Accept a work request.  Invokes the API and refreshes the list on
   * success.  Shows an alert if the operation fails.
   */
  const handleAccept = async (item: any) => {
    if (!token || acceptingId) return;
    setAcceptingId(item.id);
    try {
      await API.acceptWorkRequest(token, item.id);
      setRequestError(null);
      // Refreshing the list flips this card to the green "Accepted" state,
      // which acts as the visual confirmation (no blocking alert needed).
      await fetchRequests();
    } catch (err: any) {
      setRequestError(err);
    } finally {
      setAcceptingId(null);
    }
  };

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
   * available actions depend on whether the request has been accepted
   * by the current user.  Accepted cards show a green "Accepted" chip
   * and a prominent call button.  Available cards show Accept, Navigate
   * and Call actions with a clear visual hierarchy.
   */
  const renderRequest = ({ item }: { item: any }) => {
    const accepted = isAcceptedByUser(item);
    const highlighted = item.id === highlightedRequestId;
    const accepting = acceptingId === item.id;
    const timeLabel = timeAgo(item.createdAt);
    // Fresh requests (under 2 hours old) get a "New" badge
    const isNew =
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
      distanceLabel = t('spRequests.distanceAway', { distance: d.toFixed(1) });
    }

    return (
      <View
        style={[
          styles.card,
          accepted && styles.cardAccepted,
          highlighted && styles.cardHighlighted,
        ]}
      >
        {/* Service label and time/distance */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
            <Ionicons name={item.serviceIcon} size={20} color={colors.primary} />
          </View>
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
              <Text style={styles.acceptedChipText}>{t('spRequests.acceptedChip')}</Text>
            </View>
          )}
        </View>
        {/* Location and requester */}
        <View style={styles.infoRow}>
          <Ionicons name="location-sharp" size={15} color={colors.grey} />
          <Text style={styles.infoText} numberOfLines={2}>{item.locationName}</Text>
        </View>
        {!!item.requesterName && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={15} color={colors.greyMuted} />
            <Text style={styles.infoTextMuted} numberOfLines={1}>{item.requesterName}</Text>
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
        <View style={styles.divider} />
        <View style={styles.actionRow}>
          {!accepted && (
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaFilled]}
              onPress={() => handleAccept(item)}
              disabled={accepting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('spRequests.accept')}
            >
              {accepting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.ctaLabelLight} numberOfLines={1}>{t('spRequests.accept')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity // @todo: Navigate CTA may be dangerous for app engagement as users are redirected to external maps app... so should be used with caution
            style={[styles.ctaButton, accepted ? styles.ctaTintedSecondary : styles.ctaTintedPrimary]}
            onPress={() => handleNavigate(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('spRequests.navigate') || 'Navigate'}
          >
            <Ionicons
              name="navigate"
              size={16}
              color={accepted ? colors.secondary : colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.ctaLabel, { color: accepted ? colors.secondary : colors.primary }]}
              numberOfLines={1}
            >
              {t('spRequests.navigate') || 'Navigate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaButton, accepted ? styles.ctaFilled : styles.ctaTintedSecondary]}
            onPress={() => {
              if (item.requesterPhone) {
                Linking.openURL(`tel:${item.requesterPhone}`);
              } else {
                Alert.alert('Error', 'Requester phone number is not available.');
              }
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={accepted ? t('spRequests.callNow') : t('spRequests.call')}
          >
            <Ionicons
              name="call"
              size={16}
              color={accepted ? 'white' : colors.secondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={accepted ? styles.ctaLabelLight : [styles.ctaLabel, { color: colors.secondary }]}
              numberOfLines={1}
            >
              {accepted ? t('spRequests.callNow') : t('spRequests.call')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    if (!token || !requestsCacheKey) return;
    try {
      setRefreshing(true);
      const latestRequests = await API.listWorkRequests(token);
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

  return (
    <View style={{ flex: 1 }}>
      <Header 
        title="Aasaan" 
        showBackButton={false} 
        showNotification={true}
        showProfileButton={true} 
      />
      <View style={{ height: spacing.sm }} />
      <View style={styles.container}>
        <Text style={styles.pageTitle}>{t('spRequests.title')}</Text>
        {/* Segmented control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentButton, tab === 'all' && styles.segmentButtonActive]}
            onPress={() => setTab('all')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'all' }}
          >
            <Text style={[styles.segmentLabel, tab === 'all' && styles.segmentLabelActive]}>
              {t('spRequests.allTab', { count: totalCount })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, tab === 'accepted' && styles.segmentButtonActive]}
            onPress={() => setTab('accepted')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'accepted' }}
          >
            <Text style={[styles.segmentLabel, tab === 'accepted' && styles.segmentLabelActive]}>
              {t('spRequests.acceptedTab', { count: acceptedCount })}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(['all', 'today', 'within3'] as const).map(f => {
            const active = filter === f;
            const labelKey = f === 'all' ? 'spRequests.filterAll' : f === 'today' ? 'spRequests.filterToday' : 'spRequests.filterWithin3';
            const iconName = f === 'all' ? 'apps-outline' : f === 'today' ? 'time-outline' : 'navigate-outline';
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={iconName}
                  size={14}
                  color={active ? 'white' : colors.grey}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.filterLabel, active && { color: 'white' }]}>{t(labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* List */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="briefcase-outline" size={34} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {t(tab === 'accepted' ? 'spRequests.emptyAccepted' : 'spRequests.empty')}
            </Text>
            <Text style={styles.emptyHint}>
              {t(tab === 'accepted' ? 'spRequests.emptyHintAccepted' : 'spRequests.emptyHint')}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredRequests}
            keyExtractor={(item: any) => item.id}
            renderItem={renderRequest}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              listRef.current?.scrollToOffset({
                offset: Math.max(0, averageItemLength * index),
                animated: true,
              });
            }}
            contentContainerStyle={{ paddingBottom: spacing.xl * 3 }}
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
        <ErrorBanner error={requestError} onRetry={fetchRequests} />
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
  // --- Segmented control ---
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.greyLight,
    borderRadius: radius.xl,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: 'white',
  },
  // --- Filter chips ---
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
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
  // --- Empty state ---
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 20,
  },
  // --- Request cards ---
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccepted: {
    backgroundColor: '#f0fdf4',
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
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
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
  infoTextMuted: {
    flex: 1,
    fontSize: 13,
    color: colors.grey,
    marginLeft: 6,
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
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  ctaFilled: {
    backgroundColor: colors.primary,
  },
  ctaTintedPrimary: {
    backgroundColor: colors.primarySoft,
  },
  ctaTintedSecondary: {
    backgroundColor: colors.successLight,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  ctaLabelLight: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SPWorkRequestsScreen;