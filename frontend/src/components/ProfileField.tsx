import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type SharedProps = {
  title: string;
  titleIcon: keyof typeof Ionicons.glyphMap;
  fieldEditIcon?: keyof typeof Ionicons.glyphMap;
  trailingContent?: ReactNode;
  onPress: () => void;
  editing?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

type TextfieldProps = SharedProps & {
  fieldType: 'textfield';
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
};

type CustomProps = SharedProps & {
  fieldType: 'custom';
  children: ReactNode;
};

type ProfileFieldProps = TextfieldProps | CustomProps;

const ProfileField: React.FC<ProfileFieldProps> = (props) => {
  const fieldContent = props.fieldType === 'textfield'
    ? props.editing && props.onChangeText
      ? (
        <TextInput
          style={[styles.value, styles.input]}
          value={props.value}
          autoFocus
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={colors.greyMuted}
        />
      )
      : <Text style={styles.value}>{props.value}</Text>
    : props.children;

  const rowContent = (
    <>
      {fieldContent}
      {props.trailingContent}
      {props.fieldEditIcon && !props.editing && (
        <Ionicons
          name={props.fieldEditIcon === 'pencil' ? 'create-outline' : props.fieldEditIcon}
          size={18}
          color={colors.primary}
        />
      )}
    </>
  );

  return (
    <View style={[styles.section, props.containerStyle]}>
      <View style={styles.header}>
        <Ionicons name={props.titleIcon} style={styles.titleIcon} />
        <Text style={styles.title}>{props.title}</Text>
      </View>
      <TouchableOpacity onPress={props.onPress} style={styles.row} activeOpacity={1}>
        {rowContent}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleIcon: {
    marginRight: spacing.sm,
    color: colors.greyMuted,
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  value: {
    color: colors.dark,
    fontSize: 16,
    flex: 1,
    marginRight: spacing.sm,
  },
  input: {
    paddingVertical: 0,
    minHeight: 20,
  },
});

export default ProfileField;