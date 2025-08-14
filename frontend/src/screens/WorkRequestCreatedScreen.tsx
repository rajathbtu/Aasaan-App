import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';
import { useI18n } from '../i18n';

/**
 * Confirmation screen displayed after a work request has been created.
 * Shows a summary of the request and offers the user the option to
 * boost the request for increased visibility or proceed to their list
 * of requests.  Boosting triggers a payment flow handled in a
 * separate screen.
 */
const WorkRequestCreatedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useI18n();
  const { request, locationName: locationNameParam } = (route.params as any) || {};
  const serviceName = request?.service ?? 'Service';
  const locationName = locationNameParam ?? request?.location?.name ?? request?.locationName ?? t('userRequests.locationFallback');
  const tags = Array.isArray(request?.tags) ? request.tags.slice(0, 2) : [];

  const goToMyRequests = () => {
    navigation.navigate('Main', { screen: 'MyRequests' });
  };

  const handleBoost = () => {
    navigation.navigate('BoostRequest', { request });
  };

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.emptyTitle}>{t('createRequest.created.title')}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={goToMyRequests}>
          <Text style={styles.primaryButtonText}>{t('createRequest.created.goToMyRequests')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Header title="Aasaan" showNotification={false} showBackButton={true} />

      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>
      <Text style={styles.title}>{t('createRequest.created.title')}</Text>
      <Text style={styles.subtitle}>{t('createRequest.created.subtitle')}</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="flash" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>{serviceName}</Text>
            {tags.length > 0 && (
              <View style={styles.summaryTagsRow}>
                {tags.map((t: string) => (
                  <View key={t} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="location" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.summaryLabel}>{locationName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="time" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.summaryLabel}>{t('common.relative.justNow')}</Text>
        </View>
      </View>
      <Text style={styles.nextTitle}>{t('createRequest.created.nextTitle')}</Text>
      <View style={styles.stepsList}>
        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepPrimary}>{t('createRequest.created.step1Title')}</Text>
            <Text style={styles.stepSecondary}>{t('createRequest.created.step1Desc')}</Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepPrimary}>{t('createRequest.created.step2Title')}</Text>
            <Text style={styles.stepSecondary}>{t('createRequest.created.step2Desc')}</Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepPrimary}>{t('createRequest.created.step3Title')}</Text>
            <Text style={styles.stepSecondary}>{t('createRequest.created.step3Desc')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.boostCard}>
        <Text style={styles.boostTitle}>{t('createRequest.created.boostTitle')}</Text>
        <Text style={styles.boostSubtitle}>{t('createRequest.created.boostSubtitle')}</Text>
        <TouchableOpacity style={styles.boostButton} onPress={handleBoost}>
          <Text style={styles.boostButtonText}>{t('createRequest.created.boostButton')}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={goToMyRequests} style={{ alignSelf: 'center', marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <Text style={styles.viewRequestsText}>{t('createRequest.created.viewMyRequests')}</Text>
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
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successIconContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: '#eef2ff',
    padding: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  summaryTagsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
  },
  tagPillText: {
    fontSize: 12,
    color: colors.primary,
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepsList: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stepPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  stepSecondary: {
    fontSize: 12,
    color: colors.grey,
  },
  boostCard: {
    backgroundColor: '#f0f9ff',
    padding: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  boostTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  boostSubtitle: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: spacing.sm,
  },
  boostButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  boostButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewRequestsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default WorkRequestCreatedScreen;