import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Fallbacks used when a service has no (or an invalid) icon/colour. */
const FALLBACK_ICON = 'construct';
const FALLBACK_COLOR = '#607D8B';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Converts '#RGB' or '#RRGGBB' into the same colour with the given alpha (0-1). */
export const hexWithAlpha = (hex: string, alpha: number): string => {
  let r: string;
  let g: string;
  let b: string;
  if (hex.length === 4) {
    r = hex[1] + hex[1];
    g = hex[2] + hex[2];
    b = hex[3] + hex[3];
  } else {
    r = hex.slice(1, 3);
    g = hex.slice(3, 5);
    b = hex.slice(5, 7);
  }
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}${a}`;
};

type ServiceIconProps = {
  /** Ionicons glyph name (e.g. from the services master CSV). */
  icon?: string;
  /** Base colour of the glyph, also used to derive the tinted background. */
  color?: string;
  /** Diameter of the tinted circle. */
  circleSize?: number;
  /** Size of the glyph inside the circle. */
  iconSize?: number;
  /** Optional extra styles for the circular chip wrapper. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Renders a service icon inside a soft tinted circular chip, using the
 * service's own colour from the services master. Falls back to a neutral
 * wrench/construct glyph when the icon or colour is missing/invalid.
 */
const ServiceIcon: React.FC<ServiceIconProps> = ({
  icon,
  color,
  circleSize = 48,
  iconSize = 24,
  style,
}) => {
  const tint = color && HEX_COLOR_RE.test(color) ? color : FALLBACK_COLOR;
  return (
    <View
      style={[
        styles.circle,
        {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: hexWithAlpha(tint, 0.1),
          borderColor: hexWithAlpha(tint, 0.4),
          borderWidth: 0.5,
          marginBottom: 10,
        },
        style,
      ]}
    >
      <Ionicons
        name={(icon || FALLBACK_ICON) as keyof typeof Ionicons.glyphMap}
        size={iconSize}
        color={tint}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

export default ServiceIcon;