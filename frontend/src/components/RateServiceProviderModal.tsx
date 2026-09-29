import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { useI18n } from '../i18n';
import { closeWorkRequest } from '../api/index';
import ActionButton from './ActionButton';
import ProfileAvatar from './ProfileAvatar';
import RatingContainer from './RatingContainer';
import RatingStars from './RatingStars';

const ratingStarColor = '#ffd91d';
const ratingStarOutlineColor = '#ffe043';

interface RateServiceProviderModalProps {
  visible: boolean;
  request: any;
  token: string | null;
  onClose: () => void;
  onSuccess: (closedRequest: any) => void;
}

const RateServiceProviderModal: React.FC<RateServiceProviderModalProps> = ({
  visible,
  request,
  token,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [selectedProviderId, setSelectedProviderId] = useState<string | 'none' | null>(null);
  const [stars, setStars] = useState(0);
  const [error, setError] = useState<unknown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const acceptedProviders = request.acceptedProviders || [];

  useEffect(() => {
    if (visible) {
      setSelectedProviderId(null);
      setStars(0);
      setError(null);
    }
  }, [visible]);

  const toggleProviderSelection = (providerId: string | 'none') => {
    setSelectedProviderId(selectedProviderId === providerId ? null : providerId);
    setStars(0);
  };

  const submitClose = async () => {
    if (!token || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: { providerId?: string; stars?: number } = {};
      if (selectedProviderId && selectedProviderId !== 'none') payload.providerId = selectedProviderId;
      if (stars) payload.stars = stars;
      const closedRequest = await closeWorkRequest(token, request.id, payload);
      onSuccess(closedRequest);
    } catch (submissionError) {
      setError(submissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RatingContainer
      visible={visible}
      title={t('requestDetails.reviewTitle')}
      icon="ribbon-outline"
      closeAccessibilityLabel={t('requestDetails.ok')}
      error={error}
      onClose={onClose}
      maxHeight="90%"
      headerAlignment="flex-start"
      footer={(
        <>
          <View style={styles.actions}>
            <ActionButton
              buttonIcon="checkmark-circle-outline"
              buttonTitle={t('requestDetails.confirmClose')}
              buttonSubTitle={t('requestDetails.undoPrompt')}
              onPress={submitClose}
              disabled={isSubmitting}
              loading={isSubmitting}
              buttonTitleColor="#b91c1c"
              backgroundColor="#fff5f5"
              style={styles.actionButton}
            />
          </View>
          <ActionButton
            buttonIcon="close-circle-outline"
            buttonTitle={t('common.cancel')}
            onPress={onClose}
            buttonTitleColor={colors.grey}
            backgroundColor={colors.white}
            style={styles.cancelButton}
          />
        </>
      )}
    >
      <ScrollView style={styles.providerList} showsVerticalScrollIndicator={false}>
        {acceptedProviders.length > 0 && acceptedProviders.map((item: any, index: number) => {
          const provider = item.provider || {};
          const name = provider.name || item.providerId || t('requestDetails.provider');
          const avatarUri = provider.avatarUrl || undefined;
          const isSelected = selectedProviderId === item.providerId;

          return (
            <TouchableOpacity
              key={item.id || item.providerId || index}
              style={[styles.providerCard, isSelected && styles.providerCardSelected]}
              onPress={() => toggleProviderSelection(item.providerId)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.providerCardHeader}>
                <ProfileAvatar profilePic={avatarUri} profileName={name} />
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
                </View>
                <SelectionMark selected={isSelected} />
              </View>

              {isSelected && (
                <View style={styles.ratingSection}>
                  <View style={styles.ratingHeader}>
                    <Text style={styles.ratingTitle}>{t('requestDetails.ratingLabel')}</Text>
                    <View style={styles.ratingValue}>
                      <Text style={styles.ratingValueText}>{stars}</Text>
                      <Text style={styles.ratingScale}>/ 5</Text>
                    </View>
                  </View>
                  <RatingStars
                    stars={stars}
                    onSelect={setStars}
                    starColor={ratingStarColor}
                    unselectedStarColor={ratingStarOutlineColor}
                    starSize={32}
                    buttonHeight={40}
                  />
                  <View style={styles.ratingHints}>
                    <Text style={styles.ratingHint}>{t('requestDetails.poor')}</Text>
                    <Text style={styles.ratingHint}>{t('requestDetails.excellent')}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.providerCard, selectedProviderId === 'none' && styles.providerCardSelected]}
          onPress={() => toggleProviderSelection('none')}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedProviderId === 'none' }}
        >
          <View style={styles.providerCardHeader}>
            <View style={styles.noneAvatar}>
              <Ionicons name="person-outline" size={16} color={colors.grey} />
            </View>
            <View style={styles.providerDetails}>
              <Text style={styles.providerName}>{t('requestDetails.noProviderTitle')}</Text>
            </View>
            <SelectionMark selected={selectedProviderId === 'none'} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </RatingContainer>
  );
};

const SelectionMark: React.FC<{ selected: boolean }> = ({ selected }) => (
  <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
    {selected && <Ionicons name="checkmark" size={14} color={colors.white} />}
  </View>
);

const styles = StyleSheet.create({
  providerList: {
    maxHeight: 330,
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
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
    paddingTop: spacing.lg,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ratingTitle: {
    color: colors.dark,
    fontWeight: '700',
    fontSize: 15,
  },
  ratingValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ratingValueText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  ratingScale: {
    color: colors.grey,
    fontSize: 12,
    marginLeft: 2,
  },
  ratingHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  ratingHint: {
    fontSize: 10,
    color: colors.grey,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },

  cancelButton: {
    alignSelf: 'center',
    marginTop: spacing.mdPlus,
    minWidth: 160,
  },
});

export default RateServiceProviderModal;
