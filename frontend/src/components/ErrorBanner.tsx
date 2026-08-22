import React from 'react';
import axios from 'axios';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useI18n } from '../i18n';

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
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ErrorBanner;
