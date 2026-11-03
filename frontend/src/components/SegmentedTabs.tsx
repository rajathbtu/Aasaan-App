import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { consumerColors, consumerFonts } from '../theme';

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

/**
 * Pill tab track from the approved My_Requests_Handoff design:
 * light-grey rounded track, selected tab filled with the brand green
 * gradient and a white count badge, unselected tab plain with a white
 * count badge.
 */
const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ tabs, activeKey, onChange }) => (
  <View style={styles.container}>
    {tabs.map((tab) => {
      const active = tab.key === activeKey;
      const label = (
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {tab.label}
        </Text>
      );
      const badge = tab.count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={[styles.countText, active && styles.countTextActive]}>{tab.count}</Text>
        </View>
      );
      return (
        <TouchableOpacity
          key={tab.key}
          style={styles.button}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
        >
          {active ? (
            <LinearGradient
              colors={[consumerColors.primary, consumerColors.primaryDark]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.buttonSurface}
            >
              {label}
              {badge}
            </LinearGradient>
          ) : (
            <View style={[styles.buttonSurface, styles.buttonSurfaceIdle]}>
              {label}
              {badge}
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EEF1F5',
    borderRadius: 999,
    padding: 4,
  },
  button: {
    flex: 1,
  },
  buttonSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  buttonSurfaceIdle: {
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 15,
    fontFamily: consumerFonts.regular,
    color: '#171D26',
    flexShrink: 1,
  },
  labelActive: {
    fontFamily: consumerFonts.bold,
    color: consumerColors.white,
  },
  countBadge: {
    minWidth: 26,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: consumerColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontFamily: consumerFonts.bold,
    color: '#202833',
  },
  countTextActive: {
    color: consumerColors.primaryDark,
  },
});

export default SegmentedTabs;
