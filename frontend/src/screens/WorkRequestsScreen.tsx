import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ErrorBanner from '../components/ErrorBanner';
import SegmentedTabs from '../components/SegmentedTabs';
import EmptyState from '../components/EmptyState';
import ProfileAvatar from '../components/ProfileAvatar';
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

const CARD_RADIUS = 23;

/**
 * Per-category card variant from the approved My_Requests_Handoff:
 * service thumbnail tint and the matching provider-interest strip
 * gradient (green default, blue AC, amber chimney).
 */
type CardVariant = {
  artBg: string;
  stripStart: string;
  stripEnd: string;
};

const CARD_VARIANTS: Record<'green' | 'blue' | 'amber', CardVariant> = {
  green: {
    artBg: consumerColors.requestArtMint,
    stripStart: consumerColors.stripDefaultStart,
    stripEnd: consumerColors.stripDefaultEnd,
  },
  blue: {
    artBg: consumerColors.serviceArtBg,
    stripStart: consumerColors.stripBlueStart,
    stripEnd: consumerColors.stripBlueEnd,
  },
  amber: {
    artBg: consumerColors.requestArtMint,
    stripStart: consumerColors.stripAmberStart,
    stripEnd: consumerColors.stripAmberEnd,
  },
};

/** AC requests use the blue variant, chimney/hob & flame the amber one, every other category green. */
const resolveCardVariant = (iconName: string): CardVariant => {
  if (iconName === 'ss-ac') return CARD_VARIANTS.blue;
  if (iconName === 'ss-chimney' || iconName === 'ss-flame') return CARD_VARIANTS.amber;
  return CARD_VARIANTS.green;
};

/**
 * Consumer's My Requests screen — Active Requests and Completed tabs.
 * Matches the approved My_Requests_Handoff design: bold header with
 * supporting line and white notification bell (unread dot), green gradient
 * pill tabs with count badges (sticky while the list scrolls), and request
 * cards with the category artwork on its tinted square, title, relative
 * time, location, Active badge and the full-width "N Interested Providers"
 * strip with provider avatar previews; the green Create New Request CTA
 * floats above the list, always visible on screen. The bottom navigation
 * is the app's existing tab bar.
 */
const WorkRequestsScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
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

  const handleCreatePress = () => {
    navigation.navigate('Create');
  };

  /** Sticky segmented control — pins below the header once the list scrolls. */
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
          { key: 'active', label: t('userRequests.tabActive'), count: counts.active, icon: 'layers' },
          { key: 'completed', label: t('userRequests.tabCompleted'), count: counts.completed, icon: 'closed' },
        ]}
      />
    </View>
  );

  /** Floating "Create New Request" pill — pinned above the tab bar, always visible. */
  const renderCreateCta = () => (
    <View style={styles.ctaOverlay} pointerEvents="box-none">
      <TouchableOpacity
        onPress={handleCreatePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('userRequests.createNewRequest')}
      >
        <LinearGradient
          colors={[consumerColors.ctaStart, consumerColors.ctaEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaButton}
        >
          <SvgIcon name="plus" size={20} color={consumerColors.white} />
          <Text style={styles.ctaLabel}>{t('userRequests.createNewRequest')}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <ConsumerRequestCard request={item} onPress={() => handleRequestPress(item)} />
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) }]}>
      {renderHeader()}

      {/* Request List — the segmented tabs stick to the top while scrolling */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => fetchRequests(true)}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        stickyHeaderIndices={[0]}
        ListHeaderComponent={renderTabs}
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      {renderCreateCta()}
      <ErrorBanner
        error={requestError}
        onRetry={() => fetchRequests(true)} />
    </View>
  );

  function renderHeader() {
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
  }
};

type ConsumerRequestCardProps = {
  request: any;
  onPress: () => void;
};

/**
 * Approved My_Requests_Handoff request card:
 * top row — category artwork on its tinted rounded square, service title,
 * category subtitle, clock + relative time
 * and pin + location stacked in the meta column, Active status pill pinned
 * to the card's top-right; full-width provider-interest strip with the
 * avatar previews, "N Interested Providers" and a chevron (single tap
 * target opening the interested-provider list). No call / editable-location
 * affordances.
 */
const ConsumerRequestCard: React.FC<ConsumerRequestCardProps> = ({ request, onPress }) => {
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const isClosed = request.status === 'closed' || request.status === 'completed';
  const categoryLabel = request.serviceName || request.service || t('userRequests.locationFallback');
  const requestTitle = (typeof request.title === 'string' && request.title.trim()) || categoryLabel;
  const locationName = request.locationName || t('userRequests.locationFallback');
  const timeLabel = timeAgo(request.createdAt);
  const serviceIconName = resolveServiceIconName(categoryLabel);
  const variant = resolveCardVariant(serviceIconName);
  const responseCount = typeof request.responseCount === 'number' ? request.responseCount : 0;
  const interestLabel = responseCount === 1
    ? t('userRequests.interestedProviderTitle')
    : t('userRequests.interestedProvidersTitle', { count: responseCount });
  const providerPreviews: string[] = Array.isArray(request.interestedProviderPreviews)
    ? request.interestedProviderPreviews.filter(Boolean).slice(0, 3)
    : [];

  const renderProviderAvatars = () => {
    if (providerPreviews.length) {
      return providerPreviews.map((picUrl, index) => (
        <ProfileAvatar
          key={`${picUrl}-${index}`}
          picUrl={picUrl}
          profileName="Provider"
          size={30}
          containerStyle={[styles.stackAvatar, index > 0 && styles.stackAvatarOverlap]}
        />
      ));
    }
    return (
      <View style={[styles.stackAvatar, styles.stackAvatarFallback]}>
        <SvgIcon name="user" size={15} color={consumerColors.cardMeta} />
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={onPress}>
      <View style={styles.cardContent}>
        {/* Top row: service artwork, title, category, meta column, status badge */}
        <View style={styles.cardTop}>
          <View style={[styles.serviceArtWrap, { backgroundColor: variant.artBg }]}>
            <SvgIcon name={serviceIconName} size={40} color={consumerColors.primary} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.requestTitle} numberOfLines={2} ellipsizeMode="tail">
              {requestTitle}
            </Text>
            <Text style={styles.requestCategory} numberOfLines={1} ellipsizeMode="tail">
              {categoryLabel}
            </Text>
            <View style={styles.metaCol}>
              <View style={styles.metaItem}>
                <SvgIcon name="clock" size={14} color={consumerColors.cardMeta} />
                <Text style={styles.metaText}>{timeLabel}</Text>
              </View>
              <View style={styles.metaItem}>
                <SvgIcon name="pin" size={14} color={consumerColors.cardMeta} />
                <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                  {locationName}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, isClosed && styles.statusBadgeClosed]}>
            <View style={[styles.statusDot, isClosed && styles.statusDotClosed]} />
            <Text style={[styles.statusText, isClosed && styles.statusTextClosed]}>
              {isClosed ? t('userRequests.statusCompleted') : t('userRequests.statusActive')}
            </Text>
          </View>
        </View>

        {/* Provider-interest strip: avatar previews + count + chevron */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={interestLabel}
        >
          <LinearGradient
            colors={[variant.stripStart, variant.stripEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.interestRow}
          >
            <View style={styles.avatarStack}>{renderProviderAvatars()}</View>
            <Text style={styles.interestText} numberOfLines={1} ellipsizeMode="tail">
              {interestLabel}
            </Text>
            <SvgIcon name="chevron" size={17} color={consumerColors.cardTitle} />
          </LinearGradient>
        </TouchableOpacity>
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
    // Extra bottom room so the last card clears the floating Create CTA.
    paddingBottom: spacing.xl + 76,
    paddingHorizontal: spacing.lg,
  },
  /* Custom header (unchanged) */
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
  /* Sticky segmented tabs — track spans the full list width */
  tabsWrap: {
    backgroundColor: consumerColors.page,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  /* Consumer request card */
  card: {
    backgroundColor: consumerColors.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: consumerColors.border,
    padding: spacing.lg,
    paddingTop: 15,
    paddingBottom: 13,
    marginTop: spacing.lg,
    shadowColor: '#1C4236',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  serviceArtWrap: {
    width: 82,
    height: 94,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingRight: 64,
  },
  requestTitle: {
    fontSize: 18,
    fontFamily: consumerFonts.bold,
    color: consumerColors.cardTitle,
    letterSpacing: -0.4,
    lineHeight: 22,
    marginBottom: 4,
  },
  requestCategory: {
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    color: consumerColors.cardCategory,
    marginBottom: 8,
  },
  metaCol: {
    gap: 5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: consumerFonts.regular,
    color: consumerColors.cardMeta,
    lineHeight: 16,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: consumerColors.statusBg,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeClosed: {
    backgroundColor: '#EEF1F4',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: consumerColors.statusDot,
  },
  statusDotClosed: {
    backgroundColor: '#98A2AE',
  },
  statusText: {
    fontSize: 11,
    fontFamily: consumerFonts.bold,
    color: consumerColors.statusText,
  },
  statusTextClosed: {
    color: '#5D687A',
  },
  /* Provider-interest strip */
  interestRow: {
    height: 48,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    marginRight: 0,
    borderWidth: 1.5,
    borderColor: consumerColors.white,
  },
  stackAvatarOverlap: {
    marginLeft: -9,
  },
  stackAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8EDF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontFamily: consumerFonts.bold,
    color: consumerColors.cardTitle,
  },
  /* Floating Create New Request CTA */
  ctaOverlay: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  ctaButton: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00894C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  ctaLabel: {
    fontSize: 15,
    fontFamily: consumerFonts.bold,
    color: consumerColors.white,
  },
});

export default WorkRequestsScreen;
