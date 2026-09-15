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
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  infoBannerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },
});

export default InfoBanner;