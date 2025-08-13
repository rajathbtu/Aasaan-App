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

const API = USE_MOCK_API ? mockApi : realApi;

/** Helper: relative "time ago" for createdAt */
function timeAgo(value: any): string {
  if (!value) return 'Just now';
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  const diffMs = Date.now() - (d?.getTime?.() || 0);
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Helper: pick a location name if present */
function getLocationName(item: any): string {
  return item?.location?.name || item?.locationName || 'Your area';
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
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct" size={24} color="#2563eb" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.service}</Text>
          <Text style={styles.cardSubtitle}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name={item.status === 'closed' ? 'checkmark-circle' : 'ellipse'} size={10} color={item.status === 'closed' ? '#10b981' : '#10b981'} style={{ marginRight: 4 }} />
          <Text style={styles.statusText}>{item.status === 'closed' ? 'Completed' : 'Active'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLocation} numberOfLines={2} ellipsizeMode="tail">
          <Ionicons name="location" size={14} color="#6b7280" /> {getLocationName(item)}
        </Text>
        <View style={styles.tagContainer}>
          {(item.tags || []).map((tag: string) => (
            <Text key={tag} style={styles.tag}>{tag}</Text>
          ))}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('WorkRequestDetails', { id: item.id, request: item })}>
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
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
      <Header title="My Requests" showNotification={true} notificationCount={3} showBackButton={false} />

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.filterTabText, activeTab === 'active' && styles.activeTabText]}>Active Requests</Text>
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
            <Text style={[styles.filterTabText, activeTab === 'completed' && styles.activeTabText]}>Completed</Text>
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
        ListEmptyComponent={<Text style={styles.emptyText}>No requests found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: '#2563eb',
  },
  countBadgeInactive: {
    backgroundColor: '#d1d5db',
  },
  countBadgeText: {
    fontSize: 12,
    color: '#374151',
  },
  countBadgeTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
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
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 8,
  },
  cardLocation: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6 as any,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
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
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#ffffff',
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
    color: '#6b7280',
  },
});

export default WorkRequestsScreen;