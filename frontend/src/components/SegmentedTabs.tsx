import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export type SegmentedTab = {
  key: string;
  label: string;
  count?: number;
};

type SegmentedTabsProps = {
  tabs: SegmentedTab[];
  activeKey: string;
  onChange: (key: string) => void;
};

const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ tabs, activeKey, onChange }) => (
  <View style={styles.container}>
    {tabs.map((tab) => {
      const active = tab.key === activeKey;
      return (
        <TouchableOpacity
          key={tab.key}
          style={[styles.button, active && styles.buttonActive]}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
        >
          <View style={styles.content}>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {tab.count !== undefined && (
              <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{tab.count}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.greyLight,
    borderRadius: radius.xl,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.white,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    minWidth: 26,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginLeft: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  countBadgeActive: {
    backgroundColor: colors.white,
  },
  countText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: '600',
  },
  countTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default SegmentedTabs;