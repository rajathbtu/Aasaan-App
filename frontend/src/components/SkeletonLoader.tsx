import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

type Props = {
  /** Number of skeleton cards to render (default 3). */
  count?: number;
};

/**
 * Reusable list skeleton shown while a screen loads its data for the first
 * time.  Renders placeholder "cards" (icon circle, title/subtitle bars,
 * body lines and an action bar) resembling common list content, so screens
 * can keep their header/chrome visible instead of flashing a full-screen
 * spinner.
 */
const SkeletonLoader: React.FC<Props> = ({ count = 3 }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle} />
          <View style={{ flex: 1 }}>
            <View style={[styles.bar, styles.titleBar]} />
            <View style={[styles.bar, styles.subtitleBar]} />
          </View>
        </View>
        <View style={[styles.bar, styles.lineBar]} />
        <View style={[styles.bar, styles.shortLineBar]} />
        <View style={styles.actionBar} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  bar: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  titleBar: {
    width: '60%',
    height: 14,
    marginBottom: spacing.sm,
  },
  subtitleBar: {
    width: '40%',
    height: 11,
  },
  lineBar: {
    width: '80%',
    height: 12,
    marginTop: spacing.mdPlus,
  },
  shortLineBar: {
    width: '55%',
    height: 12,
    marginTop: spacing.sm,
  },
  actionBar: {
    width: '100%',
    height: 40,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
  },
});

export default SkeletonLoader;