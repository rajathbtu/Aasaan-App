import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Shows available work requests for service providers.  Providers can
 * browse requests that match their service offerings and accept those
 * they are interested in.  Accepted requests are displayed at the top
 * of the list.
 */
const SPWorkRequestsScreen: React.FC = () => {
  const { token, user } = useAuth();
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

  const handleAccept = async (item: any) => {
    if (!token) return;
    try {
      await API.acceptWorkRequest(token, item.id);
      Alert.alert('Accepted', 'You have accepted the work request');
      fetchRequests();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept request');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const accepted = item.acceptedProviders && item.acceptedProviders.some((p: any) => p.providerId === user?.id);
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.service}</Text>
        <Text style={styles.cardSubtitle}>{item.location?.name}</Text>
        <Text style={styles.cardStatus}>{accepted ? 'Accepted' : 'Available'}</Text>
        <View style={styles.actionsRow}>
          {!accepted && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleAccept(item)}>
              <Text style={styles.actionText}>Accept</Text>
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
        ListEmptyComponent={<Text style={styles.emptyText}>No requests available</Text>}
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
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
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

export default SPWorkRequestsScreen;