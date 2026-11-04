import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SvgIcon from '../assets/icons';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';

type Props = {
  expanded: boolean;
  onPress?: () => void;
  onClose?: () => void;
  onUpgrade?: () => void;
};

/** .pro-banner .benefit icons (purple tinted). */
const BENEFITS = [
  { icon: 'bolt', label: 'Early Access' },
  { icon: 'chart', label: 'More Work' },
  { icon: 'shield', label: 'Pro Badge' },
  { icon: 'headset', label: 'Priority Support' },
] as const;

const SPProBanner: React.FC<Props> = ({ expanded, onPress, onClose, onUpgrade }) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  if (!expanded) {
    return (
      <LinearGradient
        colors={[C.proGradientStart, C.proGradientMid, C.proGradientEnd]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.compact}>
        <TouchableOpacity
          style={styles.compactTouchable}
          onPress={onPress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Professional">
          <View style={[styles.crownTile, styles.crownCompact]}>
            <SvgIcon name="crown" size={26} color={C.onPrimary} />
          </View>
          <View style={styles.headerTextCol}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Upgrade to Professional</Text>
              <View style={styles.proPill}>
                <Text style={styles.proPillText}>PRO</Text>
              </View>
            </View>
          </View>
          <View style={styles.expandChevron}>
            <SvgIcon name="chevron-up" size={20} color={C.violet} />
          </View>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[C.proGradientStart, C.proGradientMid, C.proGradientEnd]}
      locations={[0, 0.52, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.expanded}>
      <View style={styles.headerRow}>
        <View style={styles.crownTile}>
          <SvgIcon name="crown" size={27} color={C.onPrimary} />
        </View>
        <View style={styles.headerTextCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Upgrade to Professional</Text>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Get early access to more work requests</Text>
        </View>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close banner">
            <SvgIcon name="x" size={17} color={C.onPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map((b, i) => (
          <View key={b.label} style={[styles.benefit, i === BENEFITS.length - 1 && styles.benefitLast]}>
            <SvgIcon name={b.icon} size={20} color={C.violet} />
            <Text style={styles.benefitLabel} numberOfLines={1}>{b.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={onUpgrade}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Upgrade Now">
        <Text style={styles.ctaText}>Upgrade Now</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  /* .pro-banner{position:fixed;bottom:85px;width:min(366px,calc(100% - 26px));border-radius:19px;
     background:linear-gradient(110deg,#a84cf1 0%,#8429dc 52%,#6e1cc4 100%);box-shadow:0 7px 19px #6823a84a} */
  expanded: {
    borderRadius: 19,
    paddingTop: 11,
    paddingHorizontal: 12,
    paddingBottom: 8,
    shadowColor: '#6823a8',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.29,
    shadowRadius: 19,
    elevation: 8,
    overflow: 'hidden',
  },
  compact: {
    borderRadius: 17,
    paddingVertical: 8,
    paddingHorizontal: 11,
    shadowColor: '#6823a8',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.29,
    shadowRadius: 19,
    elevation: 8,
    overflow: 'hidden',
  },
  compactTouchable: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  /* .pro-head{display:flex;align-items:center;gap:9px;height:40px} */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 40,
  },
  /* .pro-crown{width:43px;height:43px;border-radius:50%;background:#ffffff24} */
  crownTile: {
    width: 43,
    height: 43,
    borderRadius: 21.5,
    // Translucent glass on the brand gradient — the gradient itself never flips.
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  crownCompact: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /* .pro-title{font-size:15px;font-weight:850;white-space:nowrap} */
  title: {
    fontSize: 15,
    fontWeight: 800,
    color: C.onPrimary,
  },
  /* .pro-pill{font-size:10px;font-weight:850;background:#ffffffdf;color:#7021b7;border-radius:999px;padding:3px 7px;margin-left:4px} */
  proPill: {
    backgroundColor: C.white,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 4,
    overflow: 'hidden',
  },
  proPillText: {
    fontSize: 10,
    fontWeight: 800,
    color: C.violet,
    lineHeight: 12,
  },
  /* .pro-subtitle{font-size:11px;margin-top:4px;color:#f8edff} */
  subtitle: {
    fontSize: 11,
    marginTop: 4,
    color: C.onPrimary,
  },
  /* .pro-close{width:30px;height:30px;border-radius:50%;background:#7021b6aa} */
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    // Translucent glass on the brand gradient — the gradient itself never flips.
    backgroundColor: 'rgba(112,33,182,0.67)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /* .pro-benefits{height:61px;margin-top:9px;background:#fff;border-radius:14px;color:#6520b2;
     display:grid;grid-template-columns:repeat(4,1fr);align-items:center} */
  benefits: {
    height: 61,
    marginTop: 9,
    backgroundColor: C.white,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  /* .benefit{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
     height:45px;border-right:1px solid #e6d9f2;font-size:10px;font-weight:800;white-space:nowrap} */
  benefit: {
    flex: 1,
    height: 45,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: C.greyLight,
  },
  benefitLast: {
    borderRightWidth: 0,
  },
  benefitLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: C.violet,
  },
  /* .pro-cta{width:100%;height:30px;margin-top:6px;border-radius:11px;background:#fff;
     color:#7021b7;font-size:12px;font-weight:850;align-items:center;justify-content:center;gap:10px} */
  cta: {
    height: 30,
    marginTop: 6,
    borderRadius: 11,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: 800,
    color: C.violet,
  },
  ctaArrow: {
    fontSize: 13,
    fontWeight: 800,
    color: C.violet,
    marginTop: -1,
  },
  /* .pro-expand{width:38px;height:38px;border-radius:50%;background:#fff;color:#7624c4} */
  expandChevron: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default SPProBanner;
