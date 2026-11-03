import React, { useMemo, ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { ProfileIcon, ProfileIconName } from '../assets/profile-handoff';
import { profileFonts as F } from '../theme/profile';
import { useTheme } from '../contexts/ThemeContext';
import type { ProfilePalette } from '../theme/palette';

export type ProfileRowTrailing = 'chevron' | 'lock' | 'none';

type ProfileInfoRowProps = {
  /** Leading vector icon shown inside a soft green tile. */
  icon: ProfileIconName;
  /** Primary row label. */
  label: string;
  /** Secondary value text. */
  value?: string;
  /** Custom value content (chips, inline inputs, etc.). Replaces `value`. */
  valueNode?: ReactNode;
  /** Built-in trailing affordance. */
  trailing?: ProfileRowTrailing;
  /** Custom trailing content (save button, switch, etc.). Wins over `trailing`. */
  trailingNode?: ReactNode;
  /** Makes the whole row a button. Omit for a static information row. */
  onPress?: () => void;
  disabled?: boolean;
  /** Draws the hairline divider under this row. */
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
  iconTileStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * A single labelled row used by the Account, Experience and Service sections.
 *
 * Matches the profile reference: 32 dp soft-green icon tile, bold label,
 * muted value and a trailing chevron/lock. The whole row is one 62 dp tap
 * target so it stays comfortable on 360 dp Android devices.
 */
const ProfileInfoRow: React.FC<ProfileInfoRowProps> = ({
  icon,
  label,
  value,
  valueNode,
  trailing = 'none',
  trailingNode,
  onPress,
  disabled = false,
  showDivider = false,
  style,
  iconColor,
  iconTileStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { profile: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const resolvedIconColor = iconColor ?? C.primaryDark;
  const trailingContent = trailingNode ?? (
    trailing === 'chevron'
      ? <ProfileIcon name="chevron-right" size={18} color={C.trail} />
      : trailing === 'lock'
        ? <ProfileIcon name="lock" size={18} color={C.trail} />
        : null
  );

  const content = (
    <>
      <View style={[styles.iconTile, iconTileStyle]}>
        <ProfileIcon name={icon} size={19} color={resolvedIconColor} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
        {valueNode ?? (value ? (
          <Text style={styles.value} numberOfLines={3}>{value}</Text>
        ) : null)}
      </View>
      {trailingContent}
    </>
  );

  const rowStyle = [styles.row, showDivider && styles.divider, style];
  const a11yLabel = accessibilityLabel
    ?? `${label}${value ? `, ${value}` : ''}`;

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={rowStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {content}
    </TouchableOpacity>
  );
};

const makeStyles = (C: ProfilePalette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 62,
    paddingVertical: 9,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.rowIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: F.semiBold,
    fontSize: 13,
    color: C.ink,
    lineHeight: 17,
  },
  value: {
    marginTop: 3,
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 16,
    color: C.muted,
  },
});

export default ProfileInfoRow;
