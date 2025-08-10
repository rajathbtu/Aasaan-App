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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';

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
  const [selectedOption, setSelectedOption] = useState<'money' | 'credits'>('money');

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
    const createdText = request.createdAt
      ? new Date(request.createdAt).toLocaleDateString()
      : 'Created today';
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ padding: spacing.lg }}>
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
        >
          <View style={styles.optionRow}>
            <View style={styles.optionRadioOuter}>
              {selectedOption === 'money' && <View style={styles.optionRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Pay with Money</Text>
              <Text style={styles.optionSubtitle}>One‑time boost for this work request</Text>
            </View>
            <Text style={styles.optionPrice}>₹100</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionCard, selectedOption === 'credits' && styles.optionCardSelected]}
          onPress={() => setSelectedOption('credits')}
          disabled={user ? user.creditPoints < 100 : true}
        >
          <View style={styles.optionRow}>
            <View style={styles.optionRadioOuter}>
              {selectedOption === 'credits' && <View style={styles.optionRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Use Credit Points</Text>
              <Text style={styles.optionSubtitle}>Your balance: {user?.creditPoints ?? 0} points</Text>
            </View>
            <Text style={styles.optionPrice}>100 points</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Call to Action */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => handleBoost(selectedOption === 'credits')}
        disabled={loading || (selectedOption === 'credits' && (user ? user.creditPoints < 100 : true))}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.ctaText}>
            {selectedOption === 'credits' ? 'Use Credits' : 'Pay ₹100'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BoostRequestScreen;