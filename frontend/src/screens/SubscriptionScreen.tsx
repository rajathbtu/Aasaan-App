import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';
import { useI18n } from '../i18n';

const API = USE_MOCK_API ? mockApi : realApi;

// Pricing config
const PLAN_PRICING: Record<'basic' | 'pro', { priceInr: number; points: number }> = {
  basic: { priceInr: 100, points: 100 },
  pro: { priceInr: 200, points: 200 },
};

/**
 * Allows service providers to subscribe to a professional plan (basic or
 * pro).  Users can pay with cash or use their credit points.  After
 * subscribing the user profile is refreshed.  End users do not need to
 * subscribe to a plan, but the screen is accessible for completeness.
 */
const SubscriptionScreen: React.FC = () => {
  const { token, user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);

  const credits = user?.creditPoints ?? 0;
  const currentPlan = (user?.plan as 'free' | 'basic' | 'pro' | undefined) || 'free';

  const subscribe = async (plan: 'basic' | 'pro', useCredits: boolean) => {
    if (!token) return;
    try {
      setLoading(true);
      await API.subscribePlan(token, plan, useCredits);
      await refreshUser();
      Alert.alert(t('subscription.subscribedTitle'), t('subscription.subscribedDesc', { plan: t(`subscription.plan.${plan}`) }));
      setSelectedPlan(null);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('subscription.subscribeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      key: 'basic' as const,
      title: t('subscription.plan.basic'),
      price: PLAN_PRICING.basic.priceInr,
      features: [
        t('subscription.features.early'),
        t('subscription.features.standardRadius'),
        t('subscription.features.multiLoc'),
        t('subscription.features.priority'),
      ],
      badge: t('subscription.badge.popular'),
    },
    {
      key: 'pro' as const,
      title: t('subscription.plan.pro'),
      price: PLAN_PRICING.pro.priceInr,
      features: [
        t('subscription.features.early'),
        t('subscription.features.increasedRadius'),
        t('subscription.features.multiLoc'),
        t('subscription.features.priority'),
      ],
      badge: t('subscription.badge.bestValue'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.light }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl + 80 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('subscription.headerTitle')}</Text>
        </View>

        {/* Upgrade copy */}
        <Text style={styles.pageTitle}>{t('subscription.pageTitle')}</Text>
        <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>

        {/* Current Plan */}
        <View style={styles.currentPlanCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.currentPlanLabel}>{t('subscription.currentPlan')}</Text>
              <Text style={styles.currentPlanName}>
                {currentPlan === 'basic' ? t('subscription.plan.basic') : currentPlan === 'pro' ? t('subscription.plan.pro') : t('subscription.plan.free')}
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{t('subscription.active')}</Text>
            </View>
          </View>
        </View>

        {/* Info banner when already on paid plan */}
        {currentPlan !== 'free' && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.infoBannerText}>{t('subscription.currentPlanInfo', { plan: t(`subscription.plan.${currentPlan}`) })}</Text>
          </View>
        )}

        {/* Plan options */}
        {plans.map(plan => (
          <View key={plan.key} style={[styles.planCard, selectedPlan === plan.key && { borderColor: colors.primary }] }>
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
              <Text style={styles.selectButtonText}>{t('subscription.selectPlan')}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Payment actions for selected plan */}
        {selectedPlan && (
          <View style={styles.actionsBar}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: colors.primary }]}
                onPress={() => subscribe(selectedPlan, false)}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.payBtnText}>{t('subscription.payMoney', { price: PLAN_PRICING[selectedPlan].priceInr })}</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: credits >= PLAN_PRICING[selectedPlan].points ? colors.secondary : colors.greyLight }]}
                onPress={() => subscribe(selectedPlan, true)}
                disabled={loading || credits < PLAN_PRICING[selectedPlan].points}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.payBtnText}>
                    {credits >= PLAN_PRICING[selectedPlan].points
                      ? t('subscription.useCredits', { points: PLAN_PRICING[selectedPlan].points })
                      : t('subscription.needMore', { diff: PLAN_PRICING[selectedPlan].points - credits })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
    backgroundColor: '#fff',
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
    marginHorizontal: spacing.lg,
    marginBottom: 2,
    marginTop: spacing.md,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoBannerText: {
    color: colors.primary,
    fontSize: 12,
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
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  payBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SubscriptionScreen;