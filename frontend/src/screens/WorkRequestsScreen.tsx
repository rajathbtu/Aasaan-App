import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

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

  const handleBoost = (item: any) => {
    navigation.navigate('BoostRequest', { request: item });
  };

  const handleClose = async (item: any) => {
    if (!token) return;
    Alert.alert(
      'Close Request',
      'Are you sure the work is completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.closeWorkRequest(token, item.id, {});
              Alert.alert('Closed', 'The request has been closed');
              fetchRequests();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to close request');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isClosed = item.status === 'closed';
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.service}</Text>
        <Text style={styles.cardSubtitle}>{item.location?.name}</Text>
        <Text style={styles.cardStatus}>{isClosed ? 'Closed' : 'Active'}</Text>
        <View style={styles.actionsRow}>
          {!isClosed && !item.boosted && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleBoost(item)}>
              <Text style={styles.actionText}>Boost</Text>
            </TouchableOpacity>
          )}
          {!isClosed && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleClose(item)}>
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>No work requests yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginRight: 8,
  },
  actionText: {
    color: '#111827',
    fontSize: 14,
  },
});

export default WorkRequestsScreen;