import React, { type ComponentProps } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { consumerColors, consumerFonts } from '../theme';
import SvgIcon from '../assets/icons';

export type SegmentedTab = {
  key: string;
  label: string;
  count?: number;
  /** Optional leading icon rendered inside the pill (Active: layers, Completed: check-circle). */
  icon?: ComponentProps<typeof SvgIcon>['name'];
};

type SegmentedTabsProps = {
  tabs: SegmentedTab[];
  activeKey: string;
  onChange: (key: string) => void;
};

/**
 * Pill tab track from the approved My_Requests_Handoff design:
 * light grey-blue rounded track, selected tab filled with the brand green
 * gradient (#079E5C → #087B48) with a white semibold label and a circular
 * white count badge tinted deep green; the idle tab shows its icon/label
 * in ink with a plain white circular count badge.
 */
const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ tabs, activeKey, onChange }) => (
  <View style={styles.container}>
    {tabs.map((tab) => {
      const active = tab.key === activeKey;
      const content = (
        <>
          {tab.icon ? (
            <SvgIcon name={tab.icon} size={18} color={active ? consumerColors.white : '#172033'} />
          ) : null}
          <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
            {tab.label}
          </Text>
          {tab.count !== undefined && (
            <View style={styles.countBadge}>
              <Text style={[styles.countText, active && styles.countTextActive]}>{tab.count}</Text>
            </View>
          )}
        </>
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
              colors={[consumerColors.tabActiveStart, consumerColors.tabActiveEnd]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.buttonSurface as StyleProp<ViewStyle>}
            >
              {content}
            </LinearGradient>
          ) : (
            <View style={[styles.buttonSurface, styles.buttonSurfaceIdle]}>
              {content}
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
    backgroundColor: consumerColors.tabTrack,
    borderRadius: 40,
    padding: 5,
    gap: 5,
    minHeight: 62,
  },
  button: {
    flex: 1,
  },
  buttonSurface: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    paddingHorizontal: 7,
    gap: 6,
  },
  buttonSurfaceIdle: {
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 13.5,
    fontFamily: consumerFonts.semibold,
    color: '#172033',
    flexShrink: 1,
  },
  labelActive: {
    fontFamily: consumerFonts.bold,
    color: consumerColors.white,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 6,
    backgroundColor: consumerColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 14,
    fontFamily: consumerFonts.bold,
    color: '#172033',
  },
  countTextActive: {
    color: consumerColors.tabActiveEnd,
  },
});

export default SegmentedTabs;
