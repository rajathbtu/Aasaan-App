import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

/** Darkens a #rrggbb string by `amount`; returns null when unparseable. */
const darkenColor = (color: string, amount = 0.14): string | null => {
  const hex = (color || '').replace('#', '');
  if (!/^[\da-f]{6}$/i.test(hex)) return null;

  const channels = [0, 2, 4].map((offset) =>
    Math.round(parseInt(hex.slice(offset, offset + 2), 16) * (1 - amount))
      .toString(16).padStart(2, '0'));
  return `#${channels.join('')}`;
};

interface ActionButtonProps {
  buttonTitle: string;
  buttonIcon?: React.ComponentProps<typeof Ionicons>['name'];
  buttonSubTitle?: string;
  showRightArrow?: boolean;
  buttonTitleColor?: string;
  buttonSubtitleColor?: string;
  backgroundColor?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Optional content rendered after the title — used for trailing badges such
   * as an unread count. Mutually exclusive with `showRightArrow`.
   */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  buttonTitle,
  buttonIcon,
  buttonSubTitle,
  showRightArrow = false,
  buttonTitleColor,
  buttonSubtitleColor,
  backgroundColor,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  trailing,
  style,
}) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const isInactive = disabled || loading;

  /* Themed defaults — explicitly passed colors keep working unchanged. */
  const titleColor = buttonTitleColor ?? C.dark;
  const subtitleColor = buttonSubtitleColor ?? C.grey;
  const bg = backgroundColor ?? C.white;
  const borderColor = darkenColor(bg) ?? C.greyBorder;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bg, borderColor },
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        style,
      ]}
      onPress={onPress}
      disabled={isInactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}>
      {loading ? (
        <ActivityIndicator color={titleColor} />
      ) : buttonIcon ? (
        <Ionicons name={buttonIcon} size={18} color={titleColor} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>
      ) : null}
      <View style={styles.textContainer}>
        <Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>{buttonTitle}</Text>
        {buttonSubTitle ? (
          <Text numberOfLines={2} style={[styles.subtitle, { color: subtitleColor }]}>{buttonSubTitle}</Text>
        ) : null}
      </View>
      {showRightArrow ? (<Ionicons name="chevron-forward" size={16} color={titleColor} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>) : null}
      {trailing}
    </TouchableOpacity>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minWidth: 0,
    shadowColor: C.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  inactive: {
    opacity: 0.55,
  },
  textContainer: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 3,
  },
});

export default ActionButton;