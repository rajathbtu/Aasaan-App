import React from 'react';
import axios from 'axios';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { useI18n } from '../i18n';
import ActionButton from './ActionButton';

/** Warm red used by the banner's surfaces and the retry pill. */
const RETRY_BG = '#fd7b7b';

type ErrorBannerProps = {
  error: unknown | null;
  onRetry?: () => void;
};

const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onRetry,
}) => {
  const { t } = useI18n();
  if (!error) return null;

  const errorType = axios.isAxiosError(error) && !error.response ? 'network' : 'api';

  const titleKey = `errorBanner.titles.${errorType}`;
  const messageKey = `errorBanner.messages.${errorType}`;
  const retryLabel = t('errorBanner.retry');

  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <View style={styles.errorIconContainer}>
        <Ionicons name="cloud-offline-outline" size={20} color={colors.error} />
      </View>
      <View style={styles.errorMessageContainer}>
        <Text style={styles.errorTitle}>{t(titleKey)}</Text>
        <Text style={styles.errorMessage}>{t(messageKey)}</Text>
      </View>
      {onRetry && (
        <ActionButton
          buttonTitle={retryLabel}
          buttonTitleColor={colors.white}
          backgroundColor={RETRY_BG}
          onPress={onRetry}
          style={styles.retryButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  errorBanner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 5,
    backgroundColor: '#fcebeb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    zIndex: 100,
  },
  errorIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    marginRight: 10,
  },
  errorMessageContainer: {
    flex: 1,
  },
  errorTitle: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  errorMessage: {
    color: colors.grey,
    fontSize: 13,
  },
  retryButton: {
    // ActionButton defaults to alignSelf:'flex-start'; this banner centres its
    // children on the cross axis, so restore that for the compact retry pill.
    alignSelf: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export default ErrorBanner;
