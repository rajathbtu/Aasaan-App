import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import SegmentedTabs from '../components/SegmentedTabs';
import EmptyState from '../components/EmptyState';
import { listWorkRequests } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { consumerColors, consumerFonts, spacing } from '../theme';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo } from '../utils/commonUtils';
import { resolveServiceIconName } from '../utils/serviceIcon';
import SkeletonLoader from '../components/SkeletonLoader';
import SvgIcon from '../assets/icons';

type RequestTab = 'active' | 'completed';
type RequestsByTab = Record<RequestTab, any[]>;

const CARD_RADIUS = 20;

/**
 * Consumer's My Requests screen — Active Requests and Completed tabs.
 * Matches the approved My_Requests_Handoff design: bold header with
 * supporting line and white notification bell (unread dot), green
 * gradient pill tabs with count badges, and request cards with the
 * category artwork, title, relative time, Active badge and the
 * read-only single-line request address. No customer name / call / interest
 * actions; the bottom navigation is the app's existing tab bar.
 */
const WorkRequestsScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const timeAgo = buildTimeAgo(t);
  const [requestsByTab, setRequestsByTab] = useState<RequestsByTab>({
    active: [],
    completed: [],
  });
  const [counts, setCounts] = useState({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestError, setRequestError] = useState<unknown | null>(null);
  const [activeTab, setActiveTab] = useState<RequestTab>('active');
  const loadedTabs = React.useRef<Record<RequestTab, boolean>>({
    active: false,
    completed: false,
  });
  const requests = requestsByTab[activeTab];
  const userId = user?.id;

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (!token || !userId) return;
    const status = activeTab === 'active' ? 'active' : 'closed';
    const cacheKey = offlineCacheKey('user-requests', userId, status);
    try {
      if (isRefresh) setRefreshing(true);
      else if (!loadedTabs.current[activeTab]) setLoading(true);
      if (!loadedTabs.current[activeTab]) {
        const cached = await readOfflineCache<{ requests: any[]; counts?: typeof counts }>(cacheKey);
        if (cached) {
          setRequestsByTab((current) => ({ ...current, [activeTab]: cached.requests || [] }));
          if (cached.counts) setCounts(cached.counts);
          loadedTabs.current[activeTab] = true;
          setLoading(false);
        }
      }
      const result = await listWorkRequests(token, status);
      const nextRequests = result.requests || result;
      setRequestError(null);
      setRequestsByTab((current) => ({
        ...current,
        [activeTab]: nextRequests,
      }));
      if (result.counts) setCounts(result.counts);
      await writeOfflineCache(cacheKey, { requests: nextRequests, counts: result.counts });
      loadedTabs.current[activeTab] = true;
    } catch (error) {
      setRequestError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const handleRequestPress = (item: any) => {
    navigation.navigate('WorkRequestDetails', { id: item.id, request: item });
  };

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const renderHeader = () => {
    return (
      <View style={styles.customHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t('userRequests.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('userRequests.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationsPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('userRequests.title')}
        >
          <SvgIcon name="bell" size={21} color={consumerColors.ink} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsWrap}>
      <SegmentedTabs
        activeKey={activeTab}
        onChange={(key: string) => {
          const nextTab = key as RequestTab;
          setActiveTab(nextTab);
          setLoading(!loadedTabs.current[nextTab]);
        }}
        tabs={[
          { key: 'active', label: t('userRequests.tabActive'), count: counts.active },
          { key: 'completed', label: t('userRequests.tabCompleted'), count: counts.completed },
        ]}
      />
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <ConsumerRequestCard request={item} onPress={() => handleRequestPress(item)} />
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) }]}>
      {renderHeader()}
      {renderTabs()}

      {/* Request List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => fetchRequests(true)}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <SkeletonLoader count={4} />
          ) : (
            <EmptyState
              icon="briefcase-outline"
              title={t(activeTab === 'active' ? 'userRequests.emptyActiveTitle' : 'userRequests.emptyCompletedTitle')}
              description={t(activeTab === 'active' ? 'userRequests.emptyActiveDescription' : 'userRequests.emptyCompletedDescription')}/>
          )
        }
      />
      <ErrorBanner
        error={requestError}
        onRetry={() => fetchRequests(true)} />
    </View>
  );
};

type ConsumerRequestCardProps = {
  request: any;
  onPress: () => void;
};

/**
 * Approved My_Requests_Handoff request card:
 * top row — category artwork on a pale-blue rounded square, service title,
 * category subtitle, clock + relative time, Active status pill;
 * divider;
 * bottom row — mint circular location icon and the request address on a
 * single line (display only). No call / interest / editable-location
 * affordances.
 */
const ConsumerRequestCard: React.FC<ConsumerRequestCardProps> = ({ request, onPress }) => {
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const isClosed = request.status === 'closed' || request.status === 'completed';
  const requestTitle = (typeof request.title === 'string' && request.title.trim()) || request.serviceName || request.service || t('userRequests.locationFallback');
  const categoryLabel = request.serviceName || request.service || t('userRequests.locationFallback');
  const locationName = request.locationName || t('userRequests.locationFallback');
  const timeLabel = timeAgo(request.createdAt);
  const serviceIconName = resolveServiceIconName(categoryLabel);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={onPress}>
      <View style={styles.cardContent}>
        {/* Top row: service artwork, title, category, time, status badge */}
        <View style={styles.cardTop}>
          <View style={styles.serviceArtWrap}>
            <SvgIcon name={serviceIconName} size={42} color={consumerColors.primary} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.requestTitle} numberOfLines={2} ellipsizeMode="tail">
              {requestTitle}
            </Text>
            <Text style={styles.requestCategory} numberOfLines={1} ellipsizeMode="tail">
              {categoryLabel}
            </Text>
            <View style={styles.metaRow}>
              <SvgIcon name="clock" size={14} color={consumerColors.muted} style={{ marginRight: 6 }} />
              <Text style={styles.metaText}>{timeLabel}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, isClosed && styles.statusBadgeClosed]}>
            <View style={[styles.statusDot, isClosed && styles.statusDotClosed]} />
            <Text style={[styles.statusText, isClosed && styles.statusTextClosed]}>
              {isClosed ? t('userRequests.statusCompleted') : t('userRequests.statusActive')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bottom row: read-only request address (single line) */}
        <View style={styles.locationRow}>
          <View style={styles.locationIconWrap}>
            <SvgIcon name="location" size={20} color={consumerColors.primary} />
          </View>
          <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">
            {locationName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: consumerColors.page,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 20,
    paddingHorizontal: spacing.lg,
  },
  /* Custom header */
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: consumerColors.page,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 27,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    letterSpacing: -1,
    lineHeight: 33,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    marginTop: 4,
    lineHeight: 20,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: consumerColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#243E52',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#E51E2A',
    borderWidth: 1.5,
    borderColor: consumerColors.white,
  },
  /* Tabs */
  tabsWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  /* Consumer request card */
  card: {
    backgroundColor: consumerColors.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: consumerColors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  serviceArtWrap: {
    width: 78,
    height: 78,
    borderRadius: 20,
    backgroundColor: consumerColors.serviceArtBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  requestTitle: {
    fontSize: 17,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    lineHeight: 21,
    marginBottom: 2,
  },
  requestCategory: {
    fontSize: 13.5,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    marginBottom: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: consumerColors.statusBg,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 'auto',
  },
  statusBadgeClosed: {
    backgroundColor: '#EEF1F4',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: consumerColors.statusDot,
    marginRight: 6,
  },
  statusDotClosed: {
    backgroundColor: '#98A2AE',
  },
  statusText: {
    fontSize: 12.5,
    fontFamily: consumerFonts.bold,
    color: consumerColors.statusText,
  },
  statusTextClosed: {
    color: '#5D687A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8ED',
    marginVertical: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: consumerColors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationAddress: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
  },
});

export default WorkRequestsScreen;
