import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';
import { useI18n } from '../i18n';
import Header from '../components/Header';

const API = USE_MOCK_API ? mockApi : realApi;

const MONEY_PRICE_INR = 100;
const CREDIT_COST = 100;

function buildTimeAgo(t: ReturnType<typeof useI18n>['t']) {
  return (value: any): string => {
    if (!value) return t('common.relative.justNow');
    const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    const diff = Date.now() - (d?.getTime?.() || 0);
    if (!Number.isFinite(diff) || diff < 0) return t('common.relative.justNow');
    const m = Math.floor(diff / 60000);
    if (m < 1) return t('common.relative.justNow');
    if (m < 60) return t('common.relative.minAgo', { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t('common.relative.hourAgo', { count: h });
    const days = Math.floor(h / 24);
    return t('common.relative.dayAgo', { count: days });
  };
}

const BoostRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { request } = (route.params as any) || {};
  const { token, user, refreshUser } = useAuth();
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
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
      Alert.alert(t('common.success'), t('boostRequest.successDesc'));
      navigation.navigate('Main', { screen: 'MyRequests' });
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('boostRequest.errorBoostFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('boostRequest.notFound')}</Text>
      </View>
    );
  }

  const renderRequestSummary = () => {
    const createdText = request.createdAt ? timeAgo(request.createdAt) : t('common.relative.justNow');
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
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header title={t('boostRequest.title')} showBackButton={true} showNotification={false} />
      <View style={{ height: spacing.sm }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl + 40 }}>
        {/* Request Summary */}
        {renderRequestSummary()}

        {/* Already boosted banner */}
        {alreadyBoosted && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.infoBannerText}>{t('boostRequest.alreadyBoosted')}</Text>
          </View>
        )}

        {/* Boost Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('boostRequest.benefitsTitle')}</Text>
          <View style={styles.benefitRow}>
            <Ionicons name="arrow-up-circle" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.benefitText}>{t('boostRequest.benefitVisibility')}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="trophy" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.benefitText}>{t('boostRequest.benefitPriority')}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="alert" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.benefitText}>{t('boostRequest.benefitUrgentBadge')}</Text>
          </View>
        </View>

        {/* Payment Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('boostRequest.paymentTitle')}</Text>
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
                <Text style={styles.optionTitle}>{t('boostRequest.payWithMoney')}</Text>
                <Text style={styles.optionSubtitle}>{t('boostRequest.moneySubtitle')}</Text>
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
                <Text style={styles.optionTitle}>{t('boostRequest.useCredits')}</Text>
                <Text style={styles.optionSubtitle}>{t('boostRequest.balance', { points: credits })}</Text>
                {!hasEnoughCredits && (
                  <Text style={[styles.optionSubtitle, { color: colors.error }]}>{t('boostRequest.needMore', { diff: CREDIT_COST - credits })}</Text>
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
                ? t('boostRequest.ctaAlreadyBoosted')
                : selectedOption === 'credits'
                ? t('boostRequest.ctaUseCredits')
                : t('boostRequest.ctaPay', { price: MONEY_PRICE_INR })}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  summaryCard: {
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.primaryLight,
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
    backgroundColor: colors.white,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
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
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BoostRequestScreen;