import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type ServicesSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  placeholders?: string[];
  style?: StyleProp<ViewStyle>;
};

const ServicesSearchBar: React.FC<ServicesSearchBarProps> = ({
  value,
  onChangeText,
  placeholder,
  placeholders = [],
  style,
}) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const hasRotatingPlaceholders = placeholders.length > 0;

  useEffect(() => {
    if (!hasRotatingPlaceholders) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [hasRotatingPlaceholders, placeholders.length]);

  const currentPlaceholder = hasRotatingPlaceholders
    ? placeholders[placeholderIndex]
    : placeholder;

  return (
    <View style={[styles.wrapper, styles.shadow, style]}>
      <Ionicons name="search" size={20} color={colors.greyMuted} style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        placeholder={currentPlaceholder}
        placeholderTextColor={colors.greyMuted}
        value={value}
        onChangeText={onChangeText}
      />
      {value.trim() !== '' && (
        <TouchableOpacity style={styles.resetButton} hitSlop={10} onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={20} color={colors.greyMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 12,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.xl * 1.5,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.dark,
    outlineStyle: 'none' as any,
  },
  resetButton: {
    position: 'absolute',
    right: spacing.md,
    top: 10,
    padding: 4,
  },
  shadow: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

export default ServicesSearchBar;