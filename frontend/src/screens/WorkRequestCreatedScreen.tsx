import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import Header from '../components/Header';

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
  const { request } = (route.params as any) || {};

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
        <Text style={styles.emptyTitle}>Request Created!</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={goToMyRequests}>
          <Text style={styles.primaryButtonText}>Go to My Requests</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.light }}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      {/* Header */}
      <Header title="Aasaan" showNotification={false} showBackButton={true} />

      {/* Success icon */}
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>
      {/* Title */}
      <Text style={styles.title}>Work Request Created!</Text>
      <Text style={styles.subtitle}>
        Your request has been successfully created and is now visible to service providers in your area.
      </Text>
      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="flash" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>{request.service}</Text>
            {request.tags && request.tags.length > 0 && (
              <View style={styles.summaryTagsRow}>
                {request.tags.slice(0, 2).map((t: string) => (
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
          <Text style={styles.summaryLabel}>{request.location.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="time" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.summaryLabel}>Just now</Text>
        </View>
      </View>
      {/* What happens next */}
      <Text style={styles.nextTitle}>What happens next?</Text>
      <View style={styles.stepsList}>
        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepPrimary}>Service providers will see your request</Text>
            <Text style={styles.stepSecondary}>Providers in your area will be notified about your request</Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepPrimary}>You’ll get notified when they respond</Text>
            <Text style={styles.stepSecondary}>You’ll receive notifications when providers accept your request</Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepPrimary}>Call and hire the right provider</Text>
            <Text style={styles.stepSecondary}>View all responses and call providers directly from the app</Text>
          </View>
        </View>
      </View>
      {/* Boost card */}
      <View style={styles.boostCard}>
        <Text style={styles.boostTitle}>Want faster responses?</Text>
        <Text style={styles.boostSubtitle}>Boost your request to get noticed by more service providers</Text>
        <TouchableOpacity style={styles.boostButton} onPress={handleBoost}>
          <Text style={styles.boostButtonText}>Boost Request</Text>
        </TouchableOpacity>
      </View>
      {/* View requests link */}
      <TouchableOpacity onPress={goToMyRequests} style={{ alignSelf: 'center', marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <Text style={styles.viewRequestsText}>View My Requests</Text>
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