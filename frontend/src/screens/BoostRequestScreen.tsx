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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';

const API = USE_MOCK_API ? mockApi : realApi;

// Pricing constants (can be moved to config or fetched later)
const MONEY_PRICE_INR = 100;
const CREDIT_COST = 100;

// Helper: relative time
const timeAgo = (value: any): string => {
  if (!value) return 'Just now';
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  const t = d?.getTime?.() || 0;
  const diff = Date.now() - t;
  if (!Number.isFinite(diff) || diff < 0) return 'Just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const dys = Math.floor(h / 24);
  return `${dys} day${dys === 1 ? '' : 's'} ago`;
};

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
  const [selectedOption, setSelectedOption] = useState<'money' | 'credits'>('money');

  const credits = user?.creditPoints ?? 0;
  const hasEnoughCredits = credits >= CREDIT_COST;

  const handleBoost = async (useCredits: boolean) => {
    if (!token || !request) return;
    try {
      setLoading(true);
      await API.boostWorkRequest(token, request.id, useCredits);
      await refreshUser();
      Alert.alert('Success', 'Your request has been boosted');
      navigation.navigate('Main', { screen: 'MyRequests' });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to boost request');
    } finally {
      setLoading(false);
    }
  };

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No request found</Text>
      </View>
    );
  }

  const renderRequestSummary = () => {
    const createdText = request.createdAt ? timeAgo(request.createdAt) : 'Just now';
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="flash" size={20} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryService}>{request.service}</Text>
            {request.tags && request.tags.length > 0 && (
              <View style={styles.summaryTagsRow}>
                {request.tags.slice(0, 2).map((t: string) => (
                  <View key={t} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
            {request.location?.name && (
              <Text style={styles.summaryLocation}>{request.location.name}</Text>
            )}
          </View>
          <Text style={styles.summaryTime}>{createdText}</Text>
        </View>
      </View>
    );
  };

  const alreadyBoosted = !!request.boosted;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.light }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl + 40 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boost Request</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Request Summary */}
        {renderRequestSummary()}

        {/* Already boosted banner */}
        {alreadyBoosted && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.infoBannerText}>This request is already boosted.</Text>
          </View>
        )}

        {/* Boost Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boost Your Request</Text>
          <View style={styles.benefitRow}>
            <Ionicons name="arrow-up-circle" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.benefitText}>Get higher visibility to service providers</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="trophy" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.benefitText}>Priority placement at the top of listings</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="alert" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.benefitText}>Add "Urgent" badge to attract attention</Text>
          </View>
        </View>

        {/* Payment Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Options</Text>
          <TouchableOpacity
            style={[styles.optionCard, selectedOption === 'money' && styles.optionCardSelected]}
            onPress={() => setSelectedOption('money')}
            disabled={alreadyBoosted}
          >
            <View style={styles.optionRow}>
              <View style={styles.optionRadioOuter}>
                {selectedOption === 'money' && <View style={styles.optionRadioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Pay with Money</Text>
                <Text style={styles.optionSubtitle}>One‑time boost for this work request</Text>
              </View>
              <Text style={styles.optionPrice}>₹{MONEY_PRICE_INR}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, selectedOption === 'credits' && styles.optionCardSelected, !hasEnoughCredits && { opacity: 0.6 }]}
            onPress={() => setSelectedOption('credits')}
            disabled={!hasEnoughCredits || alreadyBoosted}
          >
            <View style={styles.optionRow}>
              <View style={styles.optionRadioOuter}>
                {selectedOption === 'credits' && <View style={styles.optionRadioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Use Credit Points</Text>
                <Text style={styles.optionSubtitle}>Your balance: {credits} points</Text>
                {!hasEnoughCredits && (
                  <Text style={[styles.optionSubtitle, { color: colors.error }]}>Need {CREDIT_COST - credits} more points</Text>
                )}
              </View>
              <Text style={styles.optionPrice}>{CREDIT_COST} points</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Call to Action */}
        <TouchableOpacity
          style={[styles.ctaButton, alreadyBoosted && { backgroundColor: colors.greyLight }]}
          onPress={() => handleBoost(selectedOption === 'credits')}
          disabled={loading || (selectedOption === 'credits' && !hasEnoughCredits) || alreadyBoosted}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.ctaText}>
              {alreadyBoosted
                ? 'Already Boosted'
                : selectedOption === 'credits'
                  ? 'Use Credits'
                  : `Pay ₹${MONEY_PRICE_INR}`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
  },
  emptyText: {
    fontSize: 18,
    color: colors.dark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.dark,
  },
  summaryCard: {
    backgroundColor: '#eef2ff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContainer: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  summaryService: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  summaryTagsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
  },
  tagPillText: {
    fontSize: 12,
    color: colors.primary,
  },
  summaryLocation: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 4,
  },
  summaryTime: {
    fontSize: 12,
    color: colors.grey,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  benefitText: {
    fontSize: 14,
    color: colors.grey,
    flex: 1,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eef2ff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  optionSubtitle: {
    fontSize: 12,
    color: colors.grey,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoBannerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BoostRequestScreen;