import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';

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
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);

  const subscribe = async (plan: 'basic' | 'pro', useCredits: boolean) => {
    if (!token) return;
    try {
      setLoading(true);
      await API.subscribePlan(token, plan, useCredits);
      await refreshUser();
      Alert.alert('Subscribed', `You are now on the ${plan} plan`);
      setSelectedPlan(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      key: 'basic' as const,
      title: 'Basic Plan',
      price: 100,
      features: [
        'Early notifications for new work requests',
        'Standard service radius',
        'Multiple service locations',
        'Priority listing',
      ],
      badge: 'Popular',
    },
    {
      key: 'pro' as const,
      title: 'Pro Plan',
      price: 200,
      features: [
        'Early notifications for new work requests',
        'Increased service radius (up to 20km)',
        'Multiple service locations (up to 5)',
        'Priority listing in end user’s view',
      ],
      badge: 'Best Value',
    },
  ];

  const currentPlan = user?.plan || 'Free';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Professional Plans</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={22} color={colors.dark} />
          {user?.notifications && user.notifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{user.notifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {/* Upgrade copy */}
      <Text style={styles.pageTitle}>Upgrade your experience</Text>
      <Text style={styles.subtitle}>Choose a plan that suits your needs and get more work opportunities</Text>
      {/* Current Plan */}
      <View style={styles.currentPlanCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.currentPlanLabel}>Current Plan</Text>
            <Text style={styles.currentPlanName}>{currentPlan === 'basic' ? 'Basic Plan' : currentPlan === 'pro' ? 'Pro Plan' : 'Free Plan'}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>
      </View>
      {/* Plan options */}
      {plans.map(plan => (
        <View key={plan.key} style={styles.planCard}>
          {/* Badge */}
          <View style={[styles.planBadge, plan.key === 'basic' ? styles.popularBadge : styles.bestValueBadge]}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planPrice}>₹{plan.price} <Text style={{ fontSize: 12 }}> /month</Text></Text>
          {plan.features.map((feat, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons
                name={idx < (plan.key === 'basic' ? 3 : 4) ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={16}
                color={idx < (plan.key === 'basic' ? 3 : 4) ? colors.secondary : colors.greyLight}
                style={{ marginRight: spacing.sm }}
              />
              <Text
                style={[styles.featureText, idx < (plan.key === 'basic' ? 3 : 4) ? {} : { color: colors.grey }]}
              >
                {feat}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSelectedPlan(plan.key)}
          >
            <Text style={styles.selectButtonText}>Select Plan</Text>
          </TouchableOpacity>
        </View>
      ))}
      {/* Proceed to payment */}
      {selectedPlan && (
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={() => subscribe(selectedPlan, false)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  notificationBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
    marginHorizontal: spacing.lg,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.grey,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  currentPlanCard: {
    backgroundColor: '#eef2ff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  currentPlanLabel: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: 2,
  },
  currentPlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  activeBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.lg,
  },
  activeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  planBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  popularBadge: {
    backgroundColor: '#fde68a',
  },
  bestValueBadge: {
    backgroundColor: '#a5f3fc',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.dark,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 12,
    color: colors.dark,
    flex: 1,
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SubscriptionScreen;