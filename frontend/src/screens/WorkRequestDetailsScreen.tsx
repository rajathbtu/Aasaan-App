import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  // SafeAreaView, // removed to avoid double safe-area with shared Header
  Linking,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { getWorkRequest, closeWorkRequest } from '../api/index';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import Header from '../components/Header';

// Helper: relative time (localized)
function buildTimeAgo(t: ReturnType<typeof useI18n>['t']) {
  return (value: any): string => {
    if (!value) return t('common.relative.justNow');
    const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    const time = d?.getTime?.() || 0;
    const diff = Date.now() - time;
    if (!Number.isFinite(diff) || diff < 0) return t('common.relative.justNow');

    // If older than a week, show absolute date with time
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (diff >= weekMs) {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      };
      return new Date(time).toLocaleString(undefined, options);
    }

    const m = Math.floor(diff / 60000);
    if (m < 1) return t('common.relative.justNow');
    if (m < 60) return t('common.relative.minAgo', { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t('common.relative.hourAgo', { count: h });
    const dny = Math.floor(h / 24);
    return t('common.relative.dayAgo', { count: dny });
  };
}

const WorkRequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const [request, setRequest] = useState(route.params?.request || null);
  const [closeVisible, setCloseVisible] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | 'none' | null>(null);
  const [stars, setStars] = useState<number>(4);

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
        <Text style={styles.emptyText}>{t('requestDetails.notFound')}</Text>
      </View>
    );
  }

  const handleBoost = () => {
    navigation.navigate('BoostRequest', { request });
  };

  const handleClose = () => {
    // Open close modal with default selection (first provider if any)
    const first = request?.acceptedProviders?.[0]?.providerId as string | undefined;
    setSelectedProviderId(first || 'none');
    setStars(4);
    setCloseVisible(true);
  };

  const confirmClose = async (skipRating?: boolean) => {
    if (!token) return;
    try {
      const payload: any = {};
      if (!skipRating) {
        if (selectedProviderId && selectedProviderId !== 'none') payload.providerId = selectedProviderId;
        if (stars) payload.stars = stars;
      }
      await closeWorkRequest(token, request.id, payload);
      setCloseVisible(false);
      setRequest({ ...request, status: 'closed' });
      Alert.alert(t('requestDetails.closedTitle'), t('requestDetails.closedDesc'), [
        { text: t('requestDetails.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || 'Failed to close request');
    }
  };

  const status = (request.status || 'active').toString().toLowerCase();
  const isActive = status === 'active';
  const isCompleted = status === 'completed' || status === 'closed';

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header title={request.service} showBackButton={true} showNotification={false} />
      {/* Small spacer to avoid any overlap and keep consistent spacing */}
      <View style={{ height: spacing.sm }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="flash" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.summaryLabel}>{request.service}</Text>
            {request.status !== undefined && (
              <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.successLight : colors.greyLight }]}> 
                <Text style={[styles.statusBadgeText, { color: isActive ? colors.success : colors.dark }]}>{isActive ? t('requestDetails.statusActive') : (request.status as any)}</Text>
              </View>
            )}
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.summaryValue}>{timeAgo(request.createdAt)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="location" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.summaryValue} numberOfLines={2} ellipsizeMode="tail">{request.location?.name || t('userRequests.locationFallback')}</Text>
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

        {/* Action buttons (hidden for completed/closed requests) */}
        {!isCompleted && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.boostButton} onPress={handleBoost}>
              <Ionicons name="flash" size={16} color={colors.white} style={{ marginRight: spacing.sm }} />
              <Text style={styles.boostButtonText}>{t('requestDetails.boost')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close-circle" size={16} color={colors.dark} style={{ marginRight: spacing.sm }} />
              <Text style={styles.closeButtonText}>{t('requestDetails.close')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Accepted providers */}
        {request.acceptedProviders && request.acceptedProviders.length > 0 && (
          <View style={styles.acceptedSection}>
            <Text style={styles.acceptedTitle}>{t('requestDetails.acceptedBy', { count: request.acceptedProviders.length })}</Text>
            {request.acceptedProviders.map((p: any, index: number) => {
              const provider = p.provider || {};
              const displayName = provider.name || p.providerId || t('requestDetails.provider');
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
                        if (!phone) { Alert.alert(t('requestDetails.callUnavailableTitle'), t('requestDetails.callUnavailableDesc')); return; }
                        Linking.openURL(`tel:${phone}`).catch(() => Alert.alert(t('requestDetails.callFailedTitle'), t('requestDetails.callFailedDesc')));
                      }}
                    >
                      <Ionicons name="call" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
                      <Text style={styles.callButtonText}>{t('requestDetails.call')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert(t('requestDetails.provider'), displayName)}>
                      <Ionicons name="information-circle" size={18} color={colors.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Close Modal */}
      <Modal visible={closeVisible} transparent animationType="slide" onRequestClose={() => setCloseVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <TouchableOpacity onPress={() => setCloseVisible(false)} style={{ padding: spacing.xs }}>
                <Ionicons name="arrow-back" size={18} color={colors.dark} />
              </TouchableOpacity>
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.primary }}>{t('requestDetails.ratingTitle')}</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Request Summary */}
            <View style={styles.modalSummary}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="construct" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ fontWeight: '600', color: colors.dark }}>{request.service}</Text>
                  <Text style={{ fontSize: 12, color: colors.grey }}>{timeAgo(request.createdAt)}</Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="location" size={14} color={colors.grey} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: colors.grey }} numberOfLines={2}>
                    {request.location?.name || t('userRequests.locationFallback')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {(request.tags || []).slice(0, 3).map((tag: string) => (
                    <Text key={tag} style={styles.modalTag}>{tag}</Text>
                  ))}
                </View>
              </View>
            </View>

            {/* Providers list */}
            <ScrollView style={{ maxHeight: 280 }}>
              {request.acceptedProviders && request.acceptedProviders.length > 0 ? (
                request.acceptedProviders.map((p: any, idx: number) => {
                  const provider = p.provider || {};
                  const name = provider.name || p.providerId || t('requestDetails.provider');
                  const isSelected = selectedProviderId === p.providerId;
                  return (
                    <TouchableOpacity
                      key={p.id || p.providerId || idx}
                      style={[styles.providerCard, isSelected ? styles.providerCardSelected : styles.providerCardUnselected]}
                      onPress={() => setSelectedProviderId(p.providerId)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.modalAvatar}>
                          <Text style={{ fontWeight: '700', color: colors.primary }}>{String(name).charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', color: colors.dark }}>{name}</Text>
                          <Text style={{ fontSize: 12, color: colors.grey }}>{t('requestDetails.acceptedRecently')}</Text>
                        </View>
                        <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isSelected ? colors.primary : colors.greyBorder} />
                      </View>
                      {isSelected && (
                        <View style={styles.ratingSection}>
                          <Text style={{ textAlign: 'center', color: colors.dark, fontWeight: '600', marginBottom: spacing.sm }}>{t('requestDetails.ratePrompt')}</Text>
                          <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                            {[1,2,3,4,5].map(n => (
                              <TouchableOpacity key={n} onPress={() => setStars(n)} style={[styles.starBtn, n <= stars ? styles.starBtnActive : styles.starBtnInactive]}>
                                <Ionicons name="star" size={16} color={n <= stars ? colors.white : colors.greyMuted} />
                              </TouchableOpacity>
                            ))}
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={styles.ratingHint}>{t('requestDetails.poor')}</Text>
                            <Text style={styles.ratingHint}>{t('requestDetails.excellent')}</Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : null}

              {/* None option */}
              <TouchableOpacity
                style={[styles.providerCard, selectedProviderId === 'none' ? styles.providerCardSelected : styles.providerCardUnselected]}
                onPress={() => setSelectedProviderId('none')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.modalAvatar, { backgroundColor: colors.greyLight }] }>
                    <Ionicons name="help" size={16} color={colors.grey} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.dark }}>{t('requestDetails.noneHelpedTitle')}</Text>
                    <Text style={{ fontSize: 12, color: colors.grey }}>{t('requestDetails.noneHelpedSubtitle')}</Text>
                  </View>
                  <Ionicons name={selectedProviderId === 'none' ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selectedProviderId === 'none' ? colors.primary : colors.greyBorder} />
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Bottom actions */}
            <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
              <TouchableOpacity style={[styles.bottomBtn, styles.bottomBtnOutline]} onPress={() => confirmClose(true)}>
                <Text style={[styles.bottomBtnText, { color: colors.dark }]}>{t('requestDetails.skip')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bottomBtn, styles.bottomBtnPrimary]} onPress={() => confirmClose(false)}>
                <Text style={[styles.bottomBtnText, { color: colors.white }]}>{t('requestDetails.confirmClose')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: colors.dark,
    fontSize: 16,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
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
    color: colors.dark,
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
    color: colors.dark,
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
    color: colors.white,
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
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  providerAvatarText: {
    fontWeight: '700',
    color: colors.primary,
  },
  avatarImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.greyLight,
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
    color: colors.grey,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalSummary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  modalTag: {
    backgroundColor: colors.surface,
    color: colors.dark,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 4,
    marginBottom: 4,
  },
  providerCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  providerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  providerCardUnselected: {
    borderColor: colors.greyLight,
    backgroundColor: colors.white,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  ratingSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
    paddingTop: spacing.md,
  },
  starBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  starBtnActive: {
    backgroundColor: colors.accent,
  },
  starBtnInactive: {
    backgroundColor: colors.greyLight,
  },
  ratingHint: {
    fontSize: 10,
    color: colors.grey,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBtnOutline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyLight,
    marginRight: spacing.sm,
  },
  bottomBtnPrimary: {
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  bottomBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WorkRequestDetailsScreen;