import React, { type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import ErrorBanner from './ErrorBanner';
import SafeBottomBanner from './SafeBottomBanner';

interface RatingContainerProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  closeAccessibilityLabel: string;
  error: unknown | null;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: '90%';
  headerAlignment?: 'center' | 'flex-start';
}

const RatingContainer: React.FC<RatingContainerProps> = ({
  visible,
  title,
  subtitle,
  icon,
  closeAccessibilityLabel,
  error,
  onClose,
  children,
  footer,
  maxHeight,
  headerAlignment = 'center',
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={[styles.sheet, maxHeight ? { maxHeight } : undefined]} onStartShouldSetResponder={() => true}>
        <View style={styles.handle} />
        <View style={[styles.header, { alignItems: headerAlignment }]}>
          <View style={styles.headerIcon}>
            <Ionicons name={icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel={closeAccessibilityLabel}
          >
            <Ionicons name="close" size={20} color={colors.grey} />
          </TouchableOpacity>
        </View>
        {children}
        <ErrorBanner error={error} />
        {footer}
      </View>
    </Pressable>
    <SafeBottomBanner />
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.greyBorder,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: spacing.md,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.grey,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});

export default RatingContainer;