import React, { useMemo } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';
import SafeBottomBanner from './SafeBottomBanner';

type Option = { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap };

type Props = {
  visible: boolean;
  title: string;
  options: Option[];
  selectedValue: string;
  showRadio?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
};

const SingleSelectRadioModal: React.FC<Props> = ({
  visible,
  title,
  options,
  selectedValue,
  showRadio = true,
  onSelect,
  onClose,
}) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close selector"/>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={item => item.value || 'empty'}
            initialScrollIndex={options.length > 10
              ? Math.max(0, options.findIndex(item => item.value === selectedValue))
              : undefined}
            getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
            renderItem={({ item }) => {
              const selected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => onSelect(item.value)}
                  accessibilityRole={showRadio ? 'radio' : 'button'}
                  accessibilityState={showRadio ? { checked: selected } : undefined}>
                  <View style={styles.optionLabel}>
                    {item.icon && <Ionicons name={item.icon} size={20} color={C.primary} />}
                    <Text style={styles.optionText}>{item.label}</Text>
                  </View>
                  {showRadio && (
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}/>
        </View>
      </View>
      <SafeBottomBanner />
    </Modal>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: C.scrim,
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: C.white,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: C.dark,
    fontSize: 18,
    fontFamily: 'Google Sans Flex-Bold',
    marginBottom: spacing.sm,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.greyLight,
    paddingHorizontal: spacing.xs,
  },
  optionText: {
    color: C.dark,
    fontSize: 16,
    fontFamily: 'Google Sans Flex'
  },
  optionLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.greyMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: C.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.primary,
  },
});

export default SingleSelectRadioModal;
