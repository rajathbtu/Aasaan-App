import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { useI18n } from '../i18n';
import { closeWorkRequest, rateEndUser } from '../api/index';
import ActionButton from './ActionButton';
import ErrorBanner from './ErrorBanner';
import ProfileAvatar from './ProfileAvatar';
import SafeBottomBanner from './SafeBottomBanner';

const ratingStarColor = '#ffad00';
const ratingStarOutlineColor = colors.greyMuted;

interface RateAndReviewModalProps {
  visible: boolean;
  request: any;
  token: string | null;
  mode?: 'provider' | 'endUser';
  onClose: () => void;
  onSuccess?: (closedRequest?: any) => void;
}

const RateAndReviewModal: React.FC<RateAndReviewModalProps> = ({
  visible,
  request,
  token,
  mode = 'provider', // 'endUser'
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [selectedProviderId, setSelectedProviderId] = useState<string | 'none' | null>(null);
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [error, setError] = useState<unknown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRatingEndUser = mode === 'endUser';
  const acceptedProviders = request?.acceptedProviders || [];
  const ratedProvider = acceptedProviders.find((item: any) => item.providerId === selectedProviderId);
  const ratedProviderName = ratedProvider?.provider?.name || ratedProvider?.providerId || t('requestDetails.provider');
  const ratedEndUserName = request?.endUserName || request?.user?.name || t('requestDetails.endUser');
  const ratedEndUserAvatarUrl = request?.endUserAvatarUrl || request?.user?.avatarUrl;
  const ratedEndUserLocation = request?.locationName || request?.endUserLocation;

  useEffect(() => {
    if (visible) {
      setSelectedProviderId(null);
      setStars(0);
      setReview('');
      setError(null);
    }
  }, [visible]);

  const toggleProviderSelection = (providerId: string | 'none') => {
    setSelectedProviderId(selectedProviderId === providerId ? null : providerId);
    setStars(0);
    setReview('');
  };

  const submit = async () => {
    if (isSubmitting || !token || !request?.id) return;
    if (isRatingEndUser && !stars) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (isRatingEndUser) {
        await rateEndUser(token, request.id, stars, review.trim() || undefined);
        onSuccess?.();
        onClose();
      } else {
        const payload: { providerId?: string; stars?: number; review?: string } = {};
        if (selectedProviderId && selectedProviderId !== 'none') payload.providerId = selectedProviderId;
        if (stars) payload.stars = stars;
        if (review.trim()) payload.review = review.trim();
        const closedRequest = await closeWorkRequest(token, request.id, payload);
        onSuccess?.(closedRequest);
      }
    } catch (submissionError) {
      setError(submissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill}
          onPress={onClose} activeOpacity={1}
          accessibilityRole="button" accessibilityLabel={t('common.cancel')}/>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name='star-outline' size={20} color={colors.primary} />
            </View>
            <View style={styles.heading}>
              <Text style={styles.headerTitle}>
                {isRatingEndUser ? t('requestDetails.rateEndUser') : t('requestDetails.reviewTitle')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isRatingEndUser
                  ? t('requestDetails.ratingSafetySubtitle')
                  : t('requestDetails.reviewSubtitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel={t('requestDetails.ok')} >
              <Ionicons name="close" size={20} color={colors.grey} />
            </TouchableOpacity>
          </View>
          {isRatingEndUser ? (
            <View style={styles.providerCard}>
              <View style={styles.providerCardHeader}>
                <ProfileAvatar profilePic={ratedEndUserAvatarUrl} profileName={ratedEndUserName} />
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName} numberOfLines={1}>{ratedEndUserName}</Text>
                  {ratedEndUserLocation ? (
                    <View style={styles.endUserLocation}>
                      <Ionicons name="location-outline" size={15} color={colors.grey} />
                      <Text style={styles.providerSubtitle} numberOfLines={2}>{ratedEndUserLocation}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <View>
              {acceptedProviders.map((item: any, index: number) => {
                const provider = item.provider || {};
                const name = provider.name || item.providerId || t('requestDetails.provider');
                const isSelected = selectedProviderId === item.providerId;

                return (
                  <TouchableOpacity
                    key={item.id || item.providerId || index}
                    style={[styles.providerCard, isSelected && styles.providerCardSelected]}
                    onPress={() => toggleProviderSelection(item.providerId)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}>
                    <View style={styles.providerCardHeader}>
                      <ProfileAvatar profilePic={provider.avatarUrl} profileName={name} />
                      <View style={styles.providerDetails}>
                        <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
                        {provider.serviceName ? <Text style={styles.providerSubtitle} numberOfLines={1}>{provider.serviceName}</Text> : null}
                      </View>
                      <SelectionMark selected={isSelected} />
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.providerCard, selectedProviderId === 'none' && styles.providerCardSelected]}
                onPress={() => toggleProviderSelection('none')}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedProviderId === 'none' }}>
                <View style={styles.providerCardHeader}>
                  <View style={styles.noneAvatar}>
                    <Ionicons name="person-outline" size={16} color={colors.grey} />
                  </View>
                  <View style={styles.providerDetails}>
                    <Text style={styles.providerName}>{t('requestDetails.noProviderTitle')}</Text>
                    <Text style={styles.providerSubtitle}>{t('requestDetails.noProviderSubtitle')}</Text>
                  </View>
                  <SelectionMark selected={selectedProviderId === 'none'} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {(isRatingEndUser || (selectedProviderId && selectedProviderId !== 'none')) && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>
                {isRatingEndUser
                  ? t('requestDetails.rateUserPrompt', { name: ratedEndUserName })
                  : t('requestDetails.rateUserPrompt', { name: ratedProviderName })}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setStars(value)}
                    style={[styles.starButton, { height: 48 }]}
                    accessibilityRole="button" accessibilityLabel={`${value} / 5`}
                    accessibilityState={{ selected: stars === value }}>
                    <Ionicons
                      name={value <= stars ? 'star' : 'star-outline'}
                      size={36}
                      color={value <= stars ? ratingStarColor : ratingStarOutlineColor} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.ratingHints}>
                <Text style={styles.ratingHint}>{t('requestDetails.poor')}</Text>
                <Text style={styles.ratingHint}>{t('requestDetails.excellent')}</Text>
              </View>
              <View style={styles.reviewInputContainer}>
                <TextInput
                  value={review}
                  onChangeText={setReview}
                  placeholder={t('requestDetails.ratingReviewPlaceholder')}
                  placeholderTextColor={colors.greyMuted}
                  multiline maxLength={500}
                  textAlignVertical="top"
                  style={styles.reviewInput}
                  accessibilityLabel={t('requestDetails.ratingReviewPlaceholder')}/>
                <Text style={styles.reviewCount}>{review.length}/500</Text>
              </View>
            </View>
          )}

          <ErrorBanner error={error} />
          <ActionButton
            buttonIcon="checkmark-circle-outline"
            buttonTitle={isRatingEndUser ? t('requestDetails.submitRating') : t('requestDetails.confirmClose')}
            buttonSubTitle={t('requestDetails.undoPrompt')}
            onPress={submit}
            disabled={isSubmitting || (isRatingEndUser && !stars)}
            loading={isSubmitting}
            buttonTitleColor={colors.white}
            backgroundColor={colors.primary}
            style={styles.submitButton}
          />
          <ActionButton
            buttonIcon="close-circle-outline"
            buttonTitle={t('common.cancel')}
            onPress={onClose}
            buttonTitleColor={colors.primary}
            backgroundColor={colors.white}
            style={styles.cancelButton}
          />
          </ScrollView>
        </View>
      </View>
      <SafeBottomBanner />
    </Modal>
  );
};

const SelectionMark: React.FC<{ selected: boolean }> = ({ selected }) => (
  <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
    {selected && <Ionicons name="checkmark" size={14} color={colors.white} />}
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '90%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetScrollContent: {
    flexGrow: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.greyBorder,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: spacing.md,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.grey,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
  },
  providerCardSelected: {
    borderColor: colors.primary,
  },
  providerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noneAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  providerDetails: {
    flex: 1,
    minWidth: 0,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
  },
  providerSubtitle: {
    color: colors.grey,
    fontSize: 12,
    marginTop: 3,
  },
  endUserLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  selectionMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.greyBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  selectionMarkSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  ratingSection: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
    paddingTop: spacing.md,
  },
  ratingTitle: {
    color: colors.dark,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  ratingHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  ratingHint: {
    fontSize: 12,
    color: colors.grey,
  },
  reviewInputContainer: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.white,
  },
  reviewInput: {
    minHeight: 48,
    padding: 0,
    color: colors.dark,
    fontSize: 14,
  },
  reviewCount: {
    alignSelf: 'flex-end',
    color: colors.grey,
    fontSize: 11,
  },
  submitButton: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: spacing.lg,
  },

  cancelButton: {
    marginTop: spacing.mdPlus,
    alignSelf: 'stretch',
    width: '100%',
  },
});

export default RateAndReviewModal;
