import React from 'react';
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
import { colors, radius, spacing } from '../theme';

const darkenColor = (color: string, amount = 0.14) => {
  const hex = color.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(hex)) return colors.greyBorder;

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
  buttonTitleColor = colors.dark,
  buttonSubtitleColor = colors.grey,
  backgroundColor = colors.white,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  trailing,
  style,
}) => {
  const isInactive = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, borderColor: darkenColor(backgroundColor) },
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        style,
      ]}
      onPress={onPress}
      disabled={isInactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={buttonTitleColor} />
      ) : buttonIcon ? (
        <Ionicons name={buttonIcon} size={18} color={buttonTitleColor} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>
      ) : null}
      <View style={styles.textContainer}>
        <Text numberOfLines={1} style={[styles.title, { color: buttonTitleColor }]}>{buttonTitle}</Text>
        {buttonSubTitle ? (
          <Text numberOfLines={2} style={[styles.subtitle, { color: buttonSubtitleColor }]}>{buttonSubTitle}</Text>
        ) : null}
      </View>
      {showRightArrow ? (<Ionicons name="chevron-forward" size={16} color={buttonTitleColor} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>) : null}
      {trailing}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
    shadowColor: '#000',
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
    fontWeight: '600',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 3,
  },
});

export default ActionButton;