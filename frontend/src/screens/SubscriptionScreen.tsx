import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Allows service providers to subscribe to a professional plan (basic or
 * pro).  Users can pay with cash or use their credit points.  After
 * subscribing the user profile is refreshed.  End users do not need to
 * subscribe to a plan, but the screen is accessible for completeness.
 */
const SubscriptionScreen: React.FC = () => {
  const { token, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const subscribe = async (plan: 'basic' | 'pro', useCredits: boolean) => {
    if (!token) return;
    try {
      setLoading(true);
      await API.subscribePlan(token, plan, useCredits);
      await refreshUser();
      Alert.alert('Subscribed', `You are now on the ${plan} plan`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  const plans: { name: 'basic' | 'pro'; cost: number }[] = [
    { name: 'basic', cost: 100 },
    { name: 'pro', cost: 200 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a plan</Text>
      {plans.map(plan => (
        <View key={plan.name} style={styles.planCard}>
          <Text style={styles.planName}>{plan.name.toUpperCase()}</Text>
          <Text style={styles.planCost}>₹{plan.cost} / month</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#2563eb' }]}
            onPress={() => subscribe(plan.name, false)}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pay</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#10b981' }]}
            onPress={() => subscribe(plan.name, true)}
            disabled={loading || (user && user.creditPoints < plan.cost)}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.buttonText}>
                {user && user.creditPoints >= plan.cost ? `Use ${plan.cost} credits` : 'Insufficient credits'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#111827',
  },
  planCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  planCost: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SubscriptionScreen;