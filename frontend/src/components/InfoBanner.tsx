import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

type InfoBannerProps = {
  message: string;
  /** Optional overrides (e.g. margins) on top of the base banner style */
  style?: StyleProp<ViewStyle>;
  /** Automatically dismiss the banner after the given duration. */
  autoDismissMs?: number;
  onDismiss?: () => void;
};

/**
 * InfoBanner - A soft, non-blocking informational banner with an info icon.
 * Render it conditionally at the call site (e.g. `{visible && <InfoBanner ... />}`).
 */
const InfoBanner: React.FC<InfoBannerProps> = ({ message, style, autoDismissMs, onDismiss }) => {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;

    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!message) return null;

  return (
    <View style={[styles.infoBanner, style]}>
      <Ionicons name="information-circle" size={16} color={colors.primary} />
      <Text style={styles.infoBannerText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  infoBannerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 1,
    lineHeight: 18,
  },
});

export default InfoBanner;