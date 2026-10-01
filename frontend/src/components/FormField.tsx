import React, { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

/**
 * Label + icon + input row used by the onboarding screens.
 *
 * Deliberately separate from `ProfileField`: that component renders a
 * read-only value that becomes editable only after a tap, while onboarding
 * fields are *always* live inputs. Keeping them apart means this one can
 * render a plain `TextInput` as a direct child of the row (no nested
 * `TouchableOpacity`, which swallows taps and flickers the keyboard) while
 * reusing the exact same visual language as the profile screen.
 */
export type FormFieldProps = {
  icon: keyof typeof Ionicons.glyphMap; /** Icon shown to the left of the label. */
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string; /** `false` renders the value as static text — used for locked fields. */
  editable?: boolean; /** Rendered to the left of the input, e.g. a flag + country code. */
  prefix?: ReactNode; /** Rendered to the right of the input, e.g. a "Change" link. */
  trailing?: ReactNode; /** Helper message shown below the row. */
  error?: string;
  keyboardType?: 'default' | 'phone-pad';
  maxLength?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const FormField: React.FC<FormFieldProps> = ({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  prefix,
  trailing,
  error,
  keyboardType = 'default',
  maxLength,
  onFocus,
  onBlur,
  containerStyle,
}) => {
  return (
    <View style={[styles.section, containerStyle]}>
      <View style={styles.header}>
        <Ionicons name={icon} size={16} color={colors.greyMuted} style={styles.headerIcon} />
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.row}>
        {prefix ? <View style={styles.prefix}>{prefix}</View> : null}

        {editable ? (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.greyMuted}
            keyboardType={keyboardType}
            maxLength={maxLength}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        ) : (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        )}

        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color={colors.error} style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    paddingRight: spacing.md,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.greyBorder,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.dark,
    paddingVertical: 0,
  },
  value: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  trailing: {
    marginLeft: spacing.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  errorIcon: {
    marginRight: spacing.xs + 2,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
});

export default FormField;