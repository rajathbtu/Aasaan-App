import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import WorkRequestCard from '../components/WorkRequestCard';
import SegmentedTabs from '../components/SegmentedTabs';
import EmptyState from '../components/EmptyState';
import { listWorkRequests } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { buildTimeAgo } from '../utils/commonUtils';
import SkeletonLoader from '../components/SkeletonLoader';

type RequestTab = 'active' | 'completed';
type RequestsByTab = Record<RequestTab, any[]>;

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

  return (
    <View style={styles.container}>
      <Header title={t('userRequests.title')} showNotification={true} showBackButton={false} />
    
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

      {/* Request List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkRequestCard
            request={item}
            showExpanded = {false}
            showResponseStatus = {true}
            onPress={() => navigation.navigate('WorkRequestDetails', { id: item.id, request: item })}
            onBoostPress={() => navigation.navigate('BoostRequest', { request: item })}
          />
        )}
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
          ): (
            <EmptyState
              icon="briefcase-outline"
              title={t(activeTab === 'active' ? 'userRequests.emptyActiveTitle' : 'userRequests.emptyCompletedTitle')}
              description={t(activeTab === 'active' ? 'userRequests.emptyActiveDescription' : 'userRequests.emptyCompletedDescription')}/>
        )}
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
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});

export default WorkRequestsScreen;