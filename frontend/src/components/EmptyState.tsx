import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { consumerColors, consumerFonts, spacing } from '../theme';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  /** Optional CTA (e.g. "Boost Request" when no providers have responded). */
  actionLabel?: string;
  onAction?: () => void;
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={40} color={consumerColors.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity
        style={styles.action}
        onPress={onAction}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 50,
    backgroundColor: consumerColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: consumerColors.primary,
  },
  actionText: {
    fontSize: 14,
    fontFamily: consumerFonts.bold,
    color: consumerColors.white,
  },
});

export default EmptyState;
