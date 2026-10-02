import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
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
}) => (
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
                  {item.icon && <Ionicons name={item.icon} size={20} color={colors.primary} />}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.dark,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.greyLight,
    paddingHorizontal: spacing.xs,
  },
  optionText: {
    color: colors.dark,
    fontSize: 16,
  },
  optionLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.greyMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});

export default SingleSelectRadioModal;