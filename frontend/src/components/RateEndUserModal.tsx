import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { useI18n } from '../i18n';
import ActionButton from './ActionButton';
import RatingContainer from './RatingContainer';
import RatingStars from './RatingStars';

interface RateEndUserModalProps {
  visible: boolean;
  endUserName: string;
  onClose: () => void;
  onSubmit: (stars: number) => Promise<void>;
}

const RateEndUserModal: React.FC<RateEndUserModalProps> = ({
  visible,
  endUserName,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();
  const [stars, setStars] = useState(0);
  const [error, setError] = useState<unknown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStars(0);
      setError(null);
    }
  }, [visible]);

  const submit = async () => {
    if (!stars || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(stars);
      onClose();
    } catch (submissionError) {
      setError(submissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RatingContainer
      visible={visible}
      title={t('requestDetails.rateEndUser')}
      subtitle={t('requestDetails.rateEndUserPrompt', { name: endUserName })}
      icon="star-outline"
      closeAccessibilityLabel={t('common.cancel')}
      error={error}
      onClose={onClose}
      footer={(
        <>
          <ActionButton
            buttonIcon="checkmark-circle-outline"
            buttonTitle={t('requestDetails.submitRating')}
            onPress={submit}
            disabled={!stars || isSubmitting}
            loading={isSubmitting}
            buttonTitleColor={colors.white}
            backgroundColor={colors.primary}
            style={styles.submitButton}
          />
          <ActionButton
            buttonIcon="close-circle-outline"
            buttonTitle={t('common.cancel')}
            onPress={onClose}
            buttonTitleColor={colors.grey}
            backgroundColor={colors.white}
          />
        </>
      )}
    >
      <RatingStars
        stars={stars}
        onSelect={setStars}
        starColor={colors.secondary}
        unselectedStarColor={colors.greyMuted}
        starSize={34}
        buttonHeight={44}
        gap={spacing.sm}
      />
      <View style={styles.ratingHints}>
        <Text style={styles.ratingHint}>{t('requestDetails.poor')}</Text>
        <Text style={styles.ratingHint}>{t('requestDetails.excellent')}</Text>
      </View>
    </RatingContainer>
  );
};

const styles = StyleSheet.create({
  ratingHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  ratingHint: {
    fontSize: 12,
    color: colors.grey,
  },
  submitButton: { marginBottom: spacing.sm },
});

export default RateEndUserModal;
