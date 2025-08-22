import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';

const API = USE_MOCK_API ? mockApi : realApi;

/** Helper: relative "time ago" for createdAt (localized) */
function buildTimeAgo(t: ReturnType<typeof useI18n>['t']) {
  return (value: any): string => {
    if (!value) return t('common.relative.justNow');
    const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    const diffMs = Date.now() - (d?.getTime?.() || 0);
    if (!Number.isFinite(diffMs) || diffMs < 0) return t('common.relative.justNow');
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('common.relative.justNow');
    if (mins < 60) return t('common.relative.minAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('common.relative.hourAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('common.relative.dayAgo', { count: days });
  };
}

/** Helper: pick a location name if present */
function getLocationName(item: any, t: ReturnType<typeof useI18n>['t']): string {
  return item?.location?.name || item?.locationName || t('userRequests.locationFallback');
}

/**
 * Displays a list of work requests created by the authenticated end user.
 * Users can view basic information about each request, boost its
 * visibility and close it once the job has been completed.  Closing a
 * request optionally prompts for a rating in the backend.
 */
const WorkRequestsScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const fetchRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const list = await API.listWorkRequests(token);
      setRequests(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [token])
  );

  const activeRequests = requests.filter(req => req.status !== 'closed');
  const completedRequests = requests.filter(req => req.status === 'closed');

  const renderRequestCard = (item: any) => (
    <TouchableOpacity
      style={styles.requestCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('WorkRequestDetails', { id: item.id, request: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.service}</Text>
          <Text style={styles.cardSubtitle}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name={item.status === 'closed' ? 'checkmark-circle' : 'ellipse'} size={10} color={colors.success} style={{ marginRight: 4 }} />
          <Text style={styles.statusText}>{item.status === 'closed' ? t('userRequests.statusCompleted') : t('userRequests.statusActive')}</Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const data = activeTab === 'active' ? activeRequests : completedRequests;
  // Sort recent first (createdAt descending)
  const list = [...data].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  return (
    <View style={styles.container}>
      <Header title={t('userRequests.title')} showNotification={true} notificationCount={3} showBackButton={false} />
      <View style={{ height: spacing.sm }} />

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.filterTabText, activeTab === 'active' && styles.activeTabText]}>{t('userRequests.tabActive')}</Text>
            <View style={[styles.countBadge, activeTab === 'active' ? styles.countBadgeActive : styles.countBadgeInactive]}>
              <Text style={[styles.countBadgeText, activeTab === 'active' && styles.countBadgeTextActive]}>{activeRequests.length}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.filterTabText, activeTab === 'completed' && styles.activeTabText]}>{t('userRequests.tabCompleted')}</Text>
            <View style={[styles.countBadge, activeTab === 'completed' ? styles.countBadgeActive : styles.countBadgeInactive]}>
              <Text style={[styles.countBadgeText, activeTab === 'completed' && styles.countBadgeTextActive]}>{completedRequests.length}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Request List */}
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderRequestCard(item)}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('userRequests.empty')}</Text>}
      />
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
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: colors.primary,
  },
  countBadgeInactive: {
    backgroundColor: colors.greyBorder,
  },
  countBadgeText: {
    fontSize: 12,
    color: colors.dark,
  },
  countBadgeTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surface,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.infoLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.grey,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: colors.grey,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6 as any,
  },
  tag: {
    backgroundColor: colors.surface,
    color: colors.dark,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  },
  emptyText: {
    fontSize: 16,
    color: colors.grey,
  },
});

export default WorkRequestsScreen;