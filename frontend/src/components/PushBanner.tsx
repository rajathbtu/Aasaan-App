import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  onPress?: () => void;
  onClose?: () => void;
}

const PushBanner: React.FC<Props> = ({ visible, title, body, onPress, onClose }) => {
  if (!visible) return null;
  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.banner} activeOpacity={0.9} onPress={onPress}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.body} numberOfLines={2}>{body}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
  },
  banner: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  body: { fontSize: 12, color: colors.grey },
  close: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.white, fontSize: 16, lineHeight: 16 },
});

export default PushBanner;
