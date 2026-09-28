import React, { type ReactNode } from 'react';
import {
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
  buttonIcon: ReactNode;
  buttonTitle: string;
  buttonSubTitle?: string;
  showRightArrow?: boolean;
  buttonTitleColor?: string;
  buttonSubtitleColor?: string;
  backgroundColor?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  buttonIcon,
  buttonTitle,
  buttonSubTitle,
  showRightArrow = false,
  buttonTitleColor = colors.dark,
  buttonSubtitleColor = colors.grey,
  backgroundColor = colors.white,
  onPress,
  style,
}) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor, borderColor: darkenColor(backgroundColor) }, style]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
  >
    {buttonIcon}
    <View style={styles.textContainer}>
      <Text style={[styles.title, { color: buttonTitleColor }]}>{buttonTitle}</Text>
      {buttonSubTitle ? (
        <Text style={[styles.subtitle, { color: buttonSubtitleColor }]}>{buttonSubTitle}</Text>
      ) : null}
    </View>
    {showRightArrow ? <Ionicons name="chevron-forward" size={16} color={buttonTitleColor} /> : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minWidth: 0,
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