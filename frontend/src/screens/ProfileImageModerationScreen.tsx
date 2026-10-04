import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { approveProfileImage, blockProfileImage, listProfileImagesForReview } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import { getOptimizedProfileImageUrl } from '../utils/profileImage';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import BlockingLoader from '../components/BlockingLoader';
import SafeBottomBanner from '../components/SafeBottomBanner';

interface ProfileImageCandidate {
  id: string;
  name: string;
  picUrl: string;
  createdAt: string;
}

const ProfileImageModerationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const { t } = useI18n();
  const [candidates, setCandidates] = useState<ProfileImageCandidate[]>([]);
  const [error, setError] = useState<unknown | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const result = await listProfileImagesForReview(token);
      setCandidates(Array.isArray(result) ? result : []);
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void loadCandidates();
  }, [loadCandidates]));

  const reviewCandidate = async (candidate: ProfileImageCandidate, decision: 'approve' | 'block') => {
    if (!token || processingUserId) return;
    setProcessingUserId(candidate.id);
    try {
      if (decision === 'approve') {
        await approveProfileImage(token, candidate.id);
      } else {
        await blockProfileImage(token, candidate.id);
      }
      await loadCandidates();
    } catch (reviewError) {
      setError(reviewError);
    } finally {
      setProcessingUserId(null);
    }
  };

  const confirmBlock = (candidate: ProfileImageCandidate) => Alert.alert(
    t('profilePhotoModeration.blockTitle'),
    t('profilePhotoModeration.blockConfirmation', { name: candidate.name }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profilePhotoModeration.block'), style: 'destructive', onPress: () => { void reviewCandidate(candidate, 'block'); } },
    ],
  );

  return (
    <View style={styles.container}>
      <Header
        title={t('profilePhotoModeration.title')}
        showBackButton
        showNotification={false}
        customRightComponent={(
          <TouchableOpacity onPress={() => { void loadCandidates(); }} accessibilityLabel={t('common.retry')}>
            <Ionicons name="refresh" size={20} color={colors.dark} />
          </TouchableOpacity>
        )}
      />
      <FlatList
        contentContainerStyle={styles.listContent}
        data={candidates}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadCandidates(); }} />}
        ListEmptyComponent={!refreshing ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={30} color={colors.grey} />
            <Text style={styles.emptyText}>{t('profilePhotoModeration.empty')}</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={styles.candidate}>
            <Image
              source={{ uri: getOptimizedProfileImageUrl(item.picUrl) }}
              style={styles.preview}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={styles.details}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => { void reviewCandidate(item, 'approve'); }}
                  disabled={processingUserId !== null}
                  accessibilityRole="button"
                >
                  <Ionicons name="checkmark" size={17} color={colors.white} />
                  <Text style={styles.approveText}>{t('profilePhotoModeration.approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.blockButton]}
                  onPress={() => confirmBlock(item)}
                  disabled={processingUserId !== null}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={17} color={colors.error} />
                  <Text style={styles.blockText}>{t('profilePhotoModeration.block')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
      <ErrorBanner error={error} onRetry={loadCandidates} />
      <BlockingLoader visible={processingUserId !== null} />
      <SafeBottomBanner />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  listContent: { padding: spacing.md, flexGrow: 1 },
  candidate: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  preview: { width: 104, height: 104, borderRadius: radius.sm, backgroundColor: colors.greyLight },
  details: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  name: { color: colors.dark, fontSize: 15, fontWeight: '600' },
  date: { color: colors.grey, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  approveButton: { backgroundColor: colors.primary },
  blockButton: { borderWidth: 1, borderColor: colors.error },
  approveText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  blockText: { color: colors.error, fontSize: 12, fontWeight: '600' },
  emptyState: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { color: colors.grey, fontSize: 14 },
});

export default ProfileImageModerationScreen;