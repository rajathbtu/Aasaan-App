import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useI18n } from '../i18n';
import WorkRequestCard from '../components/WorkRequestCard';

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
  const { request, locationName: locationNameParam, serviceName: serviceNameParam } = (route.params as any) || {};
  const displayRequest = request && {
    ...request,
    serviceName: request.serviceName || serviceNameParam || request.service || 'Service',
    locationName: locationNameParam ?? request.locationName,
  };

  usePreventRemove(true, () => {
    navigation.navigate('Main', { screen: 'Create' });
  });

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
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>

      <Text style={styles.title}>{t('createRequest.created.title')}</Text>
      <Text style={styles.subtitle}>{t('createRequest.created.subtitle')}</Text>

      <WorkRequestCard
        request={displayRequest}
        showExpanded
      />

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
  scrollView: {
    flex: 1,
    backgroundColor: colors.light,
    marginTop: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
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
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  successIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepsList: {
    marginHorizontal: 32,
    marginVertical: spacing.md,
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
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  stepPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey,
  },
  stepSecondary: {
    fontSize: 12,
    color: colors.grey,
  },
  boostCard: {
    backgroundColor: colors.infoLight,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
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
    color: colors.white,
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