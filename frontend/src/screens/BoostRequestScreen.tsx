import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Payment screen to boost a work request.  Users can choose to pay with
 * cash (simulated) or use their accumulated credit points.  After a
 * successful boost the screen navigates back to the request list.  In
 * production this screen would integrate with a payment gateway.
 */
const BoostRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { request } = (route.params as any) || {};
  const { token, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBoost = async (useCredits: boolean) => {
    if (!token || !request) return;
    try {
      setLoading(true);
      await API.boostWorkRequest(token, request.id, useCredits);
      await refreshUser();
      Alert.alert('Success', 'Your request has been boosted');
      // Navigate back to the MyRequests tab within the main navigator
      navigation.navigate('Main', { screen: 'MyRequests' });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to boost request');
    } finally {
      setLoading(false);
    }
  };

  if (!request) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No request found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Boost your request</Text>
      <Text style={styles.description}>Boosting increases the visibility of your request to providers.</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#2563eb' }]}
        onPress={() => handleBoost(false)}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pay ₹100</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#10b981' }]}
        onPress={() => handleBoost(true)}
        disabled={loading || (user && user.creditPoints < 100)}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.buttonText}>
            {user && user.creditPoints >= 100 ? 'Use 100 credits' : 'Not enough credits'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BoostRequestScreen;