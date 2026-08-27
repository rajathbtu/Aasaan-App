import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, tints } from '../theme';
import { useI18n } from '../i18n';

/**
 * Shared "Go Professional / Upgrade" promotional component used by
 * service-provider facing screens. A single source keeps the offer's look
 * & feel consistent everywhere while exposing two layouts:
 *
 *  - 'card'    : full promotion card with feature checklist (ProfileScreen)
 *  - 'compact' : slim high-contrast ribbon (SPWorkRequestsScreen)
 *
 * Colours come from the central theme; the violet "premium" family signals
 * that Professional is a step up from the standard free experience.
 */

// Premium violet palette (derived from theme.violet / violetStrong)
const VIOLET_DEEP = '#7c3aed';
const VIOLET_INK = '#5b21b6';
const VIOLET_BORDER = '#ddd6fe';

type Props = {
  /** 'card' renders the detailed profile card, 'compact' the slim ribbon */
  variant?: 'card' | 'compact';
  /** Called when the user taps the promotion body */
  onPress?: () => void;
  /** Called when the user taps the dismiss ✕ (compact variant only) */
  onClose?: () => void;
};

const FEATURE_KEYS = [
  'profile.featEarly',
  'profile.featMultiLoc',
  'profile.featRadius',
  'profile.featPriority',
] as const;

const UpgradeProBanner: React.FC<Props> = ({ variant = 'card', onPress, onClose }) => {
  const { t } = useI18n();

  /* ------------------------------------------------------------------ */
  /* Slim ribbon (work requests screen)                                  */
  /* ------------------------------------------------------------------ */
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.compactBanner}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint={t('subscription.goProSubtitle')}
      >
        {/* Decorative glow layers that fake a soft gradient */}
        <View pointerEvents="none" style={styles.glowLg} />
        <View pointerEvents="none" style={styles.glowSm} />

        <View style={styles.compactTopRow}>
          <View style={styles.crownTile}>
            <Ionicons name="trophy" size={20} color={colors.white} />
          </View>

          <View style={styles.compactTextCol}>
            <View style={styles.titleRow}>
              <Text style={styles.compactTitle}>{t('subscription.goPro')}</Text>
              <View style={styles.proChip}>
                <Text style={styles.proChipText}>PRO</Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.compactSubtitle}>
              {t('subscription.goProSubtitle')}
            </Text>
          </View>

          {onClose && (
            <TouchableOpacity
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={(e) => { e.stopPropagation(); onClose(); }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={13} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.priceRowCompact}>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>
              {t('subscription.perMonth', { price: '₹100' })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Detailed card (profile screen)                                      */
  /* ------------------------------------------------------------------ */
  return (
    <TouchableOpacity
      activeOpacity={0.94}
      style={styles.cardWrap}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={t('profile.upgradeSubtitle')}
    >
      <View style={styles.card}>
        {/* Decorative glow layers */}
        <View pointerEvents="none" style={[styles.glowLg, styles.cardGlowAdjust]} />
        <View pointerEvents="none" style={styles.glowSm} />

        {/* Header: crown tile + title/subtitle + PRO chip */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.crownTileCard}>
            <Ionicons name="trophy" size={20} color={colors.white} />
          </View>
          <View style={styles.cardHeaderTextCol}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{t('profile.upgradeTitle')}</Text>
              <View style={styles.proChipDark}>
                <Text style={styles.proChipText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>{t('profile.upgradeSubtitle')}</Text>
          </View>
        </View>

        {/* Feature checklist */}
        <View style={styles.featureList}>
          {FEATURE_KEYS.map((key) => (
            <View key={key} style={styles.featRow}>
              <View style={styles.featCheck}>
                <Ionicons name="checkmark" size={11} color={colors.white} />
              </View>
              <Text style={styles.featText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* Footer: anchor pricing + primary CTA */}
        <View style={styles.cardFooter}>
          <Text numberOfLines={1} style={styles.cardPrice}>
            {t('profile.startingFrom', { price: '₹100' })}
          </Text>
          <View style={styles.cardCta}>
            <Text style={styles.cardCtaText}>{t('profile.viewPlans')}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default UpgradeProBanner;

const styles = StyleSheet.create({
  /* ---------- shared pieces ---------- */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  proChipDark: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: VIOLET_BORDER,
  },
  proChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.white,
  },
  glowLg: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -60,
    right: -30,
  },
  glowSm: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.10)',
    bottom: -40,
    left: -20,
  },

  /* ---------- compact variant (work requests screen) ---------- */
  compactBanner: {
    overflow: 'hidden',
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: colors.violetStrong,
    borderRadius: radius.lg,
    paddingVertical: spacing.mdPlus,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: VIOLET_DEEP,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  crownTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTextCol: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  compactSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  pricePill: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  priceRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginLeft: 58,
  },
  pricePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: VIOLET_DEEP,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },

  /* ---------- card variant (profile screen) ---------- */
  cardWrap: {},
  card: {
    overflow: 'hidden',
    backgroundColor: tints.purpleSoft,
    borderWidth: 1,
    borderColor: VIOLET_BORDER,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: VIOLET_DEEP,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardGlowAdjust: {
    backgroundColor: 'rgba(139,92,246,0.10)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crownTileCard: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.violetStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: VIOLET_DEEP,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeaderTextCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    color: VIOLET_INK,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: colors.grey,
    marginTop: 2,
  },
  featureList: {
    marginTop: spacing.lg,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  featText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: colors.dark,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: VIOLET_BORDER,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  cardPrice: {
    flex: 1,
    marginRight: spacing.sm,
    fontSize: 13.5,
    fontWeight: '700',
    color: VIOLET_INK,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.violetStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    shadowColor: VIOLET_DEEP,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cardCtaText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
});
