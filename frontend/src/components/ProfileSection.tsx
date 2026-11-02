import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { ProfileIcon, ProfileIconName } from '../assets/profile-handoff';
import { profileColors as C, profileFonts as F } from '../theme/profile';

type ProfileSectionHeadingProps = {
  title: string;
  icon?: ProfileIconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Section title row: optional leading icon plus an optional right-aligned action. */
export const ProfileSectionHeading: React.FC<ProfileSectionHeadingProps> = ({
  title,
  icon,
  actionLabel,
  onAction,
  style,
}) => (
  <View style={[styles.headingRow, style]}>
    {icon ? <ProfileIcon name={icon} size={19} color={C.ink} /> : null}
    <Text style={styles.heading} numberOfLines={2}>{title}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity
        onPress={onAction}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={styles.headingAction}
      >
        <Text style={styles.headingActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/** White, hairline-bordered card used to group profile rows. */
export const ProfileCard: React.FC<{ children: ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

type ProfileActionRowProps = {
  icon: ProfileIconName;
  label: string;
  onPress: () => void;
  /**
   * 'default'      – brand icon, neutral text (not used yet)
   * 'danger'       – red icon/text on a white card (Log out)
   * 'dangerFilled' – red icon/text on the soft red card (Deactivate)
   */
  tone?: 'default' | 'danger' | 'dangerFilled';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Standalone account action (Log out, Deactivate account). */
export const ProfileActionRow: React.FC<ProfileActionRowProps> = ({
  icon,
  label,
  onPress,
  tone = 'default',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
}) => {
  const isDanger = tone === 'danger' || tone === 'dangerFilled';
  const iconColor = isDanger ? C.danger : C.primaryDark;
  return (
    <TouchableOpacity
      style={[styles.actionRow, tone === 'dangerFilled' && styles.actionRowDanger, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <ProfileIcon name={icon} size={19} color={iconColor} />
      <Text style={[styles.actionText, isDanger && styles.actionTextDanger]} numberOfLines={2}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <ProfileIcon name="chevron-right" size={18} color={C.trail} />
      )}
    </TouchableOpacity>
  );
};

type ProfileStatTileProps = {
  icon: ProfileIconName;
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
};

/** Compact two-column tile used by the Service area section. */
export const ProfileStatTile: React.FC<ProfileStatTileProps> = ({ icon, label, value, style }) => (
  <View style={[styles.stat, style]}>
    <View style={styles.statIconTile}>
      <ProfileIcon name={icon} size={18} color={C.primaryDark} />
    </View>
    <View style={styles.statGrow}>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={2}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  heading: {
    flexShrink: 1,
    fontFamily: F.bold,
    fontSize: 15,
    lineHeight: 20,
    color: C.ink,
  },
  headingAction: {
    marginLeft: 'auto',
    paddingLeft: 8,
  },
  headingActionText: {
    fontFamily: F.semiBold,
    fontSize: 12,
    color: C.primary,
  },
  card: {
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 15,
    paddingHorizontal: 12,
    shadowColor: '#15251D',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  actionRowDanger: {
    backgroundColor: '#FFFAFA',
    borderColor: '#F5DDDD',
  },
  actionText: {
    flex: 1,
    fontFamily: F.semiBold,
    fontSize: 13,
    color: C.ink,
  },
  actionTextDanger: {
    color: C.dangerText,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.statBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  statIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.rowIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statGrow: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontFamily: F.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: C.ink,
  },
  statValue: {
    marginTop: 2,
    fontFamily: F.regular,
    fontSize: 11,
    lineHeight: 14,
    color: C.muted,
  },
});
