import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import * as realApi from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo } from '../utils/time';

const API = realApi;
type RequestTab = 'active' | 'completed';
type RequestsByTab = Record<RequestTab, any[]>;

/** Helper: pick the request snapshot location name. */
function getLocationName(item: any, t: ReturnType<typeof useI18n>['t']): string {
  return item?.locationName || t('userRequests.locationFallback');
}

/**
 * Displays a list of work requests created by the authenticated end user.
 * Users can view basic information about each request, boost its
 * visibility and close it once the job has been completed.  Closing a
 * request optionally prompts for a rating in the backend.
 */
const WorkRequestsScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
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
      const result = await API.listWorkRequests(token, status);
      const nextRequests = result.requests || result;
      setRequestError(null);
      setRequestsByTab((current) => ({
        ...current,
        [activeTab]: nextRequests,
      }));
      if (result.counts) setCounts(result.counts);
      await writeOfflineCache(cacheKey, { requests: nextRequests, counts: result.counts });
      loadedTabs.current[activeTab] = true;
    } 
    catch (error) {
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

  const renderRequestCard = (item: any) => (
    <TouchableOpacity
      style={styles.requestCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('WorkRequestDetails', {
        id: item.id,
        request: {
          ...item,
        },
      })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: item.serviceColor || colors.infoLight }]}>
          <Ionicons name={(item.serviceIcon) as keyof typeof Ionicons.glyphMap} size={20} className={item.serviceColor || colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.serviceName || item.service}</Text>
          <Text style={styles.cardSubtitle}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'closed' ? styles.statusBadgeCompleted : styles.statusBadgeActive]}>
          <Ionicons name={item.status === 'closed' ? 'checkmark-circle' : 'ellipse'} size={10} color={item.status === 'closed' ? colors.success : colors.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.statusText, item.status === 'closed' ? styles.statusTextCompleted : styles.statusTextActive]}>{item.status === 'closed' ? t('userRequests.statusCompleted') : t('userRequests.statusActive')}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.locationText}><Ionicons name="location" size={14} color={colors.grey} /> {getLocationName(item, t)}</Text>
        <View style={styles.tagContainer}>
          {(item.tags || []).map((tag: string) => (
            <Text key={tag} style={styles.tag}>{tag}</Text>
          ))}
        </View>
      </View>
      {/* Removed footer button; whole card is tappable */}
    </TouchableOpacity>
  );

  if (loading && requests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={t('userRequests.title')} showNotification={true} notificationCount={3} showBackButton={false} />
      {/* <View style={{ height: spacing.sm }} /> */}

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'active' && styles.activeTab]}
          onPress={() => {
            setActiveTab('active');
            setLoading(!loadedTabs.current.active);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.filterTabText, activeTab === 'active' && styles.activeTabText]}>{t('userRequests.tabActive')}</Text>
            <View style={[styles.countBadge, activeTab === 'active' ? styles.countBadgeActive : styles.countBadgeInactive]}>
              <Text style={[styles.countBadgeText, activeTab === 'active' && styles.countBadgeTextActive]}>{counts.active}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => {
            setActiveTab('completed');
            setLoading(!loadedTabs.current.completed);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.filterTabText, activeTab === 'completed' && styles.activeTabText]}>{t('userRequests.tabCompleted')}</Text>
            <View style={[styles.countBadge, activeTab === 'completed' ? styles.countBadgeActive : styles.countBadgeInactive]}>
              <Text style={[styles.countBadgeText, activeTab === 'completed' && styles.countBadgeTextActive]}>{counts.completed}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Request List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderRequestCard(item)}
        refreshing={refreshing}
        onRefresh={() => fetchRequests(true)}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('userRequests.empty')}</Text>}
      />
      <ErrorBanner
        error={requestError}
        onRetry={() => fetchRequests(true)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.greyLight,
    overflow: 'hidden',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  activeTab: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 14,
    color: colors.grey,
    marginRight: 8,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 26,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xl,
  },
  countBadgeActive: {
    backgroundColor: colors.primary,
  },
  countBadgeInactive: {
    backgroundColor: colors.greyLight,
  },
  countBadgeText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: '600',
  },
  countBadgeTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greyLight,
    shadowColor: colors.black,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 7,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 46,
    height: 46,
    backgroundColor: colors.infoLight,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.grey,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xl,
  },
  statusBadgeActive: {
    backgroundColor: '#fff7ed',
  },
  statusBadgeCompleted: {
    backgroundColor: colors.successLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.accent,
  },
  statusTextCompleted: {
    color: colors.success,
  },
  cardBody: {
    paddingTop: spacing.lg,
    marginBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
  },
  locationText: {
    fontSize: 12,
    color: colors.grey,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6 as any,
  },
  tag: {
    backgroundColor: colors.primarySoft,
    color: colors.dark,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xl,
    marginRight: 4,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.grey,
  },
});

export default WorkRequestsScreen;