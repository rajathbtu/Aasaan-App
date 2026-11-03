import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

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

/** Icons for the flat banner variants — colors come from the active palette. */
const bannerIcons: Record<BannerTheme, keyof typeof Ionicons.glyphMap> = {
  grey: 'information-circle',
  red: 'alert-circle',
  green: 'checkmark-circle',
};

/**
 * InfoBanner - A soft, non-blocking informational banner with an info icon.
 * Render it conditionally at the call site (e.g. `{visible && <InfoBanner ... />}`).
 */
const InfoBanner: React.FC<InfoBannerProps> = ({ message, style, theme, autoDismissMs, onDismiss }) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;

    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!message) return null;

  const themeMap: Record<BannerTheme, { icon: keyof typeof Ionicons.glyphMap; color: string; textColor: string }> = {
    grey: { icon: bannerIcons.grey, color: C.grey, textColor: C.grey },
    red: { icon: bannerIcons.red, color: C.error, textColor: C.error },
    green: { icon: bannerIcons.green, color: C.success, textColor: C.success },
  };
  const selectedTheme = theme ? themeMap[theme] : { icon: bannerIcons.grey, color: C.primary, textColor: C.primary };
  const isFlatTheme = Boolean(theme);

  return (
    <View style={[isFlatTheme ? styles.infoBannerFlat : styles.infoBanner, style]}>
      <Ionicons name={selectedTheme.icon} size={16} color={selectedTheme.color} />
      <Text style={[isFlatTheme ? styles.infoBannerTextFlat : styles.infoBannerText, { color: selectedTheme.textColor }]}>{message}</Text>
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: C.primary,
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
    color: C.primary,
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