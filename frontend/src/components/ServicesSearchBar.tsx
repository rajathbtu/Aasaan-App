import React, { useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { consumerTypography } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import type { ConsumerPalette } from '../theme/palette';

type ServicesSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  placeholders?: string[];
  style?: StyleProp<ViewStyle>;
  inputRef?: React.Ref<any>;
};

const ServicesSearchBar: React.FC<ServicesSearchBarProps> = ({
  value,
  onChangeText,
  placeholder,
  placeholders = [],
  style,
  inputRef,
}) => {
  const { consumer: C, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
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
    <View style={[styles.wrapper, style]}>
      <Ionicons name="search" size={24} color={C.muted} style={styles.searchIcon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={currentPlaceholder}
        placeholderTextColor={C.muted}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        value={value}
        onChangeText={onChangeText}
        selectionColor={C.primary}
      />
      {value.trim() !== '' && (
        <TouchableOpacity style={styles.resetButton} hitSlop={10} onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={20} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const makeStyles = (C: ConsumerPalette) => StyleSheet.create({
  wrapper: {
    height: 58,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 17,
    shadowColor: C.shadowTint,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  searchIcon: {
    // Icon is a flex item per the design spec (gap 12px), not absolutely positioned.
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: C.ink,
    fontSize: consumerTypography.searchInput.fontSize,
    paddingVertical: 0,
  },
  resetButton: {
    position: 'absolute',
    right: 17,
    top: 10,
    padding: 4,
  },
});

export default ServicesSearchBar;
