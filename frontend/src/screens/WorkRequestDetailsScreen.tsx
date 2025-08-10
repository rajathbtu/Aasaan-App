import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

/**
 * Displays detailed information about a specific work request.  End users
 * and service providers can view the status of the request, tags and
 * accepted providers.  Additional actions such as calling a provider
 * could be added here in the future.
 */
const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { request } = (route.params as any) || {};

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Request not found</Text>
      </View>
    );
  }

  const handleCall = () => {
    Alert.alert('Call Provider', 'Calling feature is not implemented in this demo');
  };

  const handleBoost = () => {
    navigation.navigate('BoostRequest', { request });
  };

  const handleClose = () => {
    Alert.alert('Close Request', 'Closing a request is not implemented in this demo');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{request.service}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BoostRequest', { request })}>
          {request.boosted ? (
            <Ionicons name="flash" size={20} color={colors.secondary} />
          ) : (
            <Ionicons name="flash-outline" size={20} color={colors.dark} />
          )}
        </TouchableOpacity>
      </View>
      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="flash" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.summaryLabel}>{request.service}</Text>
          {request.status && (
            <View style={[styles.statusBadge, { backgroundColor: request.status === 'Active' ? colors.secondary : colors.greyLight }]}> 
              <Text style={styles.statusBadgeText}>{request.status}</Text>
            </View>
          )}
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="time" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.summaryValue}>2 hours ago</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="location" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.summaryValue}>{request.location?.name}</Text>
        </View>
        {request.tags && request.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {request.tags.slice(0, 3).map((tag: string) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {/* Action buttons */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.boostButton} onPress={handleBoost}>
          <Ionicons name="flash" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.boostButtonText}>Boost Request</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close-circle" size={16} color={colors.dark} style={{ marginRight: spacing.sm }} />
          <Text style={styles.closeButtonText}>Close Request</Text>
        </TouchableOpacity>
      </View>
      {/* Accepted providers list */}
      {request.acceptedProviders && request.acceptedProviders.length > 0 && (
        <View style={styles.acceptedSection}>
          <Text style={styles.acceptedTitle}>Accepted by ({request.acceptedProviders.length}):</Text>
          {request.acceptedProviders.map((p: any, index: number) => (
            <View key={p.providerId || index} style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <Text style={styles.providerAvatarText}>{p.providerId ? p.providerId.charAt(0).toUpperCase() : '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.providerId || 'Provider'}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={colors.secondary} />
                  <Text style={styles.ratingText}> 4.5 (20)</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <Ionicons name="call" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
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
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.grey,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tagPill: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagPillText: {
    fontSize: 12,
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.lg,
    marginLeft: spacing.sm,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flex: 1,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  boostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greyLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  acceptedSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  acceptedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  providerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  providerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: colors.grey,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default WorkRequestDetailsScreen;