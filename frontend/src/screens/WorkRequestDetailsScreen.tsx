import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Linking,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { getWorkRequest } from '../api/index';
import { useAuth } from '../contexts/AuthContext';

// Helper: relative time
function timeAgo(value: any): string {
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
}

const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();
  const [request, setRequest] = useState(route.params?.request || null);

  useEffect(() => {
    const id = route.params?.id || route.params?.request?.id;
    if (id && token) {
      getWorkRequest(token, id)
        .then(setRequest)
        .catch(console.error);
    }
  }, [route.params?.id, route.params?.request?.id, token]);

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Request not found</Text>
      </View>
    );
  }

  const handleBoost = () => {
    navigation.navigate('BoostRequest', { request });
  };

  const handleClose = () => {
    Alert.alert('Close Request', 'Closing a request is not implemented in this demo');
  };

  const status = (request.status || 'active').toString().toLowerCase();
  const isActive = status === 'active';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.light }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
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
            {request.status !== undefined && (
              <View style={[styles.statusBadge, { backgroundColor: isActive ? '#d1fae5' : colors.greyLight }]}> 
                <Text style={[styles.statusBadgeText, { color: isActive ? '#10b981' : colors.dark }]}>{isActive ? 'Active' : (request.status as any)}</Text>
              </View>
            )}
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.summaryValue}>{timeAgo(request.createdAt)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="location" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.summaryValue} numberOfLines={2} ellipsizeMode="tail">{request.location?.name || 'Your area'}</Text>
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
            <Ionicons name="flash" size={16} color={'#fff'} style={{ marginRight: spacing.sm }} />
            <Text style={styles.boostButtonText}>Boost</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close-circle" size={16} color={colors.dark} style={{ marginRight: spacing.sm }} />
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Accepted providers */}
        {request.acceptedProviders && request.acceptedProviders.length > 0 && (
          <View style={styles.acceptedSection}>
            <Text style={styles.acceptedTitle}>Accepted by ({request.acceptedProviders.length}):</Text>
            {request.acceptedProviders.map((p: any, index: number) => {
              const provider = p.provider || {};
              const displayName = provider.name || p.providerId || 'Provider';
              const phone = provider.phoneNumber || '';
              const avatarUri = provider.avatarUrl || undefined;
              return (
                <View key={p.id || p.providerId || index} style={styles.providerRow}>
                  {avatarUri ? (
                    <View style={styles.avatarImageWrapper}>
                      <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    </View>
                  ) : (
                    <View style={styles.providerAvatar}>
                      <Text style={styles.providerAvatarText}>{String(displayName).charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{displayName}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color={colors.secondary} />
                      <Text style={styles.ratingText}> 4.5 (20)</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => {
                        if (!phone) { Alert.alert('Unavailable', 'Provider phone not available'); return; }
                        Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Failed', 'Unable to start call'));
                      }}
                    >
                      <Ionicons name="call" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
                      <Text style={styles.callButtonText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert('Provider', displayName)}>
                      <Ionicons name="information-circle" size={18} color={colors.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    color: colors.dark,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greyLight,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginRight: spacing.sm,
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tagPill: {
    backgroundColor: colors.greyLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagPillText: {
    fontSize: 12,
    color: '#374151',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  boostButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greyLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  closeButtonText: {
    color: colors.dark,
    fontWeight: '600',
  },
  acceptedSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  acceptedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  providerAvatarText: {
    fontWeight: '700',
    color: '#1e3a8a',
  },
  avatarImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: '#e5e7eb',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  providerName: {
    fontSize: 16,
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
    color: '#6b7280',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  callButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greyLight,
  },
});

export default WorkRequestDetailsScreen;