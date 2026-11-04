import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';

type ErrorBannerProps = {
  error: unknown | null;
  onRetry?: () => void;
};

function getErrorDetails(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
    return typeof responseMessage === 'string' ? responseMessage : error.message;
  }
  return error instanceof Error ? error.message : typeof error === 'string' ? error : '';
}

/**
 * Totally-transcribes nothing in-app — renders the error as a small,
 * dismissible toast (per user request). It is *not* a full-screen popup:
 * the user dismisses it with the × button and it never blocks the UI.
 * The retry action is kept inside the toast as a tap target.
 */
const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onRetry,
}) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  if (!error || dismissed) return null;

  const errorType = axios.isAxiosError(error) && !error.response ? 'network' : 'api';

  const titleKey = `errorBanner.titles.${errorType}`;
  const messageKey = `errorBanner.messages.${errorType}`;
  const errorDetails = __DEV__ ? getErrorDetails(error) : '';

  const message = errorDetails
    ? `${t(messageKey)}\nDev Mode Debug:\n${errorDetails}`
    : t(messageKey);

  const handleRetry = () => {
    setDismissed(false);
    onRetry?.();
  };

  return (
    <View style={styles.toast} accessibilityRole="alert">
      <TouchableOpacity onPress={handleRetry} style={styles.toastBody} disabled={!onRetry} activeOpacity={0.85}>
        <Ionicons name={errorType === 'network' ? 'cloud-offline-outline' : 'alert-circle-outline'} size={18} color={C.error} />
        <Text style={styles.toastMessage} numberOfLines={2}>
          {t(titleKey)}: {message}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setDismissed(true)}
        style={styles.dismissButton}
        accessibilityRole="button"
        accessibilityLabel="Dismiss">
        <Ionicons name="close" size={14} color={C.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: C.toastBg,
    borderRadius: 999,
    shadowColor: C.black,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 1000,
  },
  toastBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toastMessage: {
    flex: 1,
    color: C.onPrimary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  dismissButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});

export default ErrorBanner;
