import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

type BannerTheme = 'grey' | 'red' | 'green';

type InfoBannerProps = {
  message: string;
  /** Optional overrides (e.g. margins) on top of the base banner style */
  style?: StyleProp<ViewStyle>;
  /** Optional flat theme for text/icon colour without background, border, or shadow */
  theme?: BannerTheme;
  /** Automatically dismiss the banner after the given duration. */
  autoDismissMs?: number;
  onDismiss?: () => void;
};

const themeMap: Record<BannerTheme, { icon: keyof typeof Ionicons.glyphMap; color: string; textColor: string }> = {
  grey: { icon: 'information-circle', color: colors.grey, textColor: colors.grey },
  red: { icon: 'alert-circle', color: colors.error, textColor: colors.error },
  green: { icon: 'checkmark-circle', color: colors.success, textColor: colors.success },
};

/**
 * InfoBanner - A soft, non-blocking informational banner with an info icon.
 * Render it conditionally at the call site (e.g. `{visible && <InfoBanner ... />}`).
 */
const InfoBanner: React.FC<InfoBannerProps> = ({ message, style, theme, autoDismissMs, onDismiss }) => {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;

    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!message) return null;

  const selectedTheme = theme ? themeMap[theme] : { icon: 'information-circle' as keyof typeof Ionicons.glyphMap, color: colors.primary, textColor: colors.primary };
  const isFlatTheme = Boolean(theme);

  return (
    <View style={[isFlatTheme ? styles.infoBannerFlat : styles.infoBanner, style]}>
      <Ionicons name={selectedTheme.icon} size={16} color={selectedTheme.color} />
      <Text style={[isFlatTheme ? styles.infoBannerTextFlat : styles.infoBannerText, { color: selectedTheme.textColor }]}>{message}</Text>
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
  infoBannerFlat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  infoBannerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 1,
    lineHeight: 18,
  },
  infoBannerTextFlat: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 1,
    lineHeight: 18,
  },
});

export default InfoBanner;