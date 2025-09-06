import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, tints } from '../theme';
import { useI18n } from '../i18n';
import Header from '../components/Header';

// Determine which API implementation to use (real or mock)
const API = USE_MOCK_API ? mockApi : realApi;

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
  const { t } = useI18n();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'accepted'>('all');
  const [filter, setFilter] = useState<'all' | 'today' | 'within3'>('all');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showProBanner, setShowProBanner] = useState(true);
  
  // Scroll-based banner visibility
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const bannerTranslateY = useRef(new Animated.Value(0)).current;

  // Fetch work requests from the API
  const fetchRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const list = await API.listWorkRequests(token);
      setRequests(list);
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
            navigation.navigate('SPSelectLocation');
          }
          return;
        }
        // If provider profile not found, start services step
        if (/provider profile not found/i.test(message)) {
          navigation.navigate('SPSelectServices', { mode: 'onboarding' });
          return;
        }
        // If location/radius not defined
        if (/location or radius not defined/i.test(message)) {
          navigation.navigate('SPSelectLocation');
          return;
        }
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread notifications to display in badge
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      // Only get unread notifications
      const list = await API.getNotifications(token, true as any);
      setUnreadCount(list.length);
    } catch (err) {
      console.error(err);
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
          navigation.navigate('SPSelectLocation');
        }
        return;
      }
      fetchRequests();
      fetchNotifications();
    }, [token, user])
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
    if (!token) return;
    try {
      await API.acceptWorkRequest(token, item.id);
      Alert.alert(t('common.success'), t('spRequests.accept'));
      fetchRequests();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to accept request');
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

  /**
   * Renders a single work request card.  The card appearance and
   * available actions depend on whether the request has been accepted
   * by the current user.  Accepted cards have a tinted green
   * background and display only a call button.  Available cards show
   * Accept and Call buttons.
   */
  const renderRequest = ({ item }: { item: any }) => {
    const accepted = isAcceptedByUser(item);
    // Format time string (e.g. "2 hrs ago")
    const now = new Date();
    const created = new Date(item.createdAt);
    const diffMs = now.getTime() - created.getTime();
    let timeLabel = '';
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (60 * 1000));
      timeLabel = `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      timeLabel = `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      timeLabel = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    // Compute distance if provider location is available
    let distance: string | null = null;
    if (user?.serviceProviderInfo?.location) {
      const d = getDistanceKm(
        user.serviceProviderInfo.location.lat,
        user.serviceProviderInfo.location.lng,
        item.locationLat,
        item.locationLng
      );
      distance = d.toFixed(1);
    }

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: accepted ? colors.successLight : colors.light,
            borderColor: accepted ? colors.success : colors.greyLight,
          },
        ]}
      >
        {/* Service label and time/distance */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: item.color }]}> 
            <Ionicons name={item.icon || 'construct'} size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.serviceName}>{item.serviceName}</Text>
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>
          {distance && (
            <Text style={styles.distanceText}>{distance} km</Text>
          )}
        </View>
        {/* Location and requester */}
        <Text style={styles.locationText}>{item.locationName}</Text>
        {item.requesterName && (
          <Text style={styles.requesterText}>{item.requesterName}</Text>
        )}
        {/* Tags */}
        <View style={styles.tagContainer}>
          {Array.isArray(item.tags) &&
            item.tags.slice(0, 3).map((tag: string) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
        </View>
        {/* Action buttons */}
        <View style={styles.actionRow}>
          {!accepted && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleAccept(item)}
            >
              <Ionicons name="checkmark" size={16} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText}>{t('spRequests.accept')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: accepted ? colors.primary : colors.secondary }]}
            onPress={() => {
              if (item.requesterPhone) {
                Linking.openURL(`tel:${item.requesterPhone}`);
              } else {
                Alert.alert('Error', 'Requester phone number is not available.');
              }
            }}
          >
            <Ionicons name="call" size={16} color="white" style={{ marginRight: 4 }} />
            <Text style={styles.actionButtonText}>{accepted ? t('spRequests.callNow') : t('spRequests.call')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const latestRequests = await API.listWorkRequests(token);
      setRequests(prevRequests => {
        const newRequests = latestRequests.filter(
          (newReq: any) => !prevRequests.some((prevReq: any) => prevReq.id === newReq.id)
        );
        return [...newRequests, ...prevRequests];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle scroll events to show/hide pro banner
  const handleScroll = useCallback((event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.y;
    const isScrollingDown = scrollOffset > 50; // Show/hide threshold
    
    if (isScrollingDown !== isScrolledDown) {
      setIsScrolledDown(isScrollingDown);
      
      // Animate banner slide down/up (no fade)
      Animated.timing(bannerTranslateY, {
        toValue: isScrollingDown ? 100 : 0, // Slide down 100px or back to 0
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isScrolledDown, bannerTranslateY]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      />
      <View style={{ height: spacing.sm }} />
      <View style={styles.container}>
        <Text style={styles.pageTitle}>{t('spRequests.title')}</Text>
        {/* Segmented control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentButton, tab === 'all' && styles.segmentButtonActive]}
            onPress={() => setTab('all')}
          >
            <Text style={[styles.segmentLabel, tab === 'all' && styles.segmentLabelActive]}>
              {t('spRequests.allTab', { count: totalCount })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, tab === 'accepted' && styles.segmentButtonActive]}
            onPress={() => setTab('accepted')}
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
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: colors.primary },
                ]}
              >
                <Text style={[styles.filterLabel, active && { color: 'white' }]}>{t(labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* List */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('spRequests.empty')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRequests}
            keyExtractor={(item: any) => item.id}
            renderItem={renderRequest}
            contentContainerStyle={{ paddingBottom: spacing.xl * 3 }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
          <Animated.View 
            style={[
              styles.proBanner,
              {
                transform: [{
                  translateY: bannerTranslateY
                }]
              }
            ]}
          >
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => navigation.navigate('Subscription')}
            >
              <View style={styles.proIconWrapper}>
                <Ionicons name="trophy" size={20} color={colors.violetStrong} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.proTitle}>{t('spRequests.goPro')}</Text>
                <Text style={styles.proSubtitle}>{t('spRequests.goProSubtitle')}</Text>
              </View>
              <View style={styles.proPriceWrapper}>
                <Text style={styles.proPrice}>{t('spRequests.perMonth', { price: '₹100' })}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowProBanner(false)}
            >
              <Ionicons name="close" size={16} color={colors.dark} />
            </TouchableOpacity>
          </Animated.View>
        )}
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
    paddingTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  pageTitle: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.greyLight,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: 'white',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
    marginRight: spacing.sm,
    backgroundColor: 'white',
  },
  filterLabel: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.grey,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.grey,
  },
  distanceText: {
    fontSize: 12,
    color: colors.grey,
  },
  locationText: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  requesterText: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: spacing.sm,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  tagChip: {
    backgroundColor: colors.greyLight,
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
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  proBanner: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  proIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  proSubtitle: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  proPriceWrapper: {
    backgroundColor: colors.violetStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  proPrice: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: colors.violetStrong,
  },
  closeButton: {
    marginLeft: spacing.md,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.greyLight,
  },
});

export default SPWorkRequestsScreen;