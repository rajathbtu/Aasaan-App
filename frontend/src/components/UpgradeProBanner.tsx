import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius } from '../theme';
import { profileColors } from '../theme/profile';
import { useI18n } from '../i18n';
import ActionButton from './ActionButton';

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

// Premium violet palette matching the approved design
const VIOLET_DEEP = '#7c3aed';
const BANNER_GRADIENT_START = '#a84cf1';
const BANNER_GRADIENT_MID = '#8429dc';
const BANNER_GRADIENT_END = '#6e1cc4';

type Props = {
  /** 'card' renders the detailed profile card, 'compact' the slim ribbon */
  variant?: 'card' | 'compact';
  /** When true (compact variant only), shows the expanded layout with benefits + CTA */
  expanded?: boolean;
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

/** `onPress` is optional; the CTA still needs a handler. */
const noop = () => {};

const UpgradeProBanner: React.FC<Props> = ({ variant = 'card', expanded = false, onPress, onClose }) => {
  const { t } = useI18n();

  /* ------------------------------------------------------------------ */
  /* Slim ribbon (work requests screen) - compact or expanded             */
  /* ------------------------------------------------------------------ */
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.compactBanner, expanded && styles.compactBannerExpanded]}
        onPress={onPress}
        accessibilityHint={t('subscription.goProSubtitle')}
      >
        {/* Decorative glow layers that fake a soft gradient */}
        <View pointerEvents="none" style={styles.glowLg} />
        <View pointerEvents="none" style={styles.glowSm} />

        <View style={styles.compactTopRow}>
          <View style={styles.crownTile}>
            <Ionicons name={"crown" as any} size={20} color={colors.white} />
          </View>

          <View style={styles.compactTextCol}>
            <View style={styles.titleRow}>
              <Text style={styles.compactTitle}>{t('subscription.goPro')}</Text>
              <View style={styles.proChip}>
                <Text style={styles.proChipText}>PRO</Text>
              </View>
            </View>
            {expanded && (
              <Text numberOfLines={2} style={styles.compactSubtitle}>
                {t('subscription.goProSubtitle')}
              </Text>
            )}
          </View>

          {expanded ? (
            <>
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
              <View style={styles.expandChevron}>
                <Ionicons name="chevron-up" size={16} color={colors.white} />
              </View>
            </>
          ) : (
            <View style={styles.expandChevron}>
              <Ionicons name="chevron-down" size={16} color={colors.white} />
            </View>
          )}
        </View>

        {expanded && (
          <View style={styles.expandedBody}>
            <View style={styles.benefitsRow}>
              {FEATURE_KEYS.map((key) => (
                <View key={key} style={styles.benefitChip}>
                  <Ionicons name="checkmark" size={10} color={colors.white} />
                  <Text style={styles.benefitText}>{t(key)}</Text>
                </View>
              ))}
            </View>
            <ActionButton
              buttonTitle={t('profile.viewPlans') || 'Upgrade Now'}
              buttonTitleColor={colors.white}
              backgroundColor={colors.white}
              onPress={onPress ?? noop}
              style={styles.expandedCta}
              showRightArrow
            />
          </View>
        )}

        {!expanded && (
          <View style={styles.priceRowCompact}>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>
                {t('subscription.perMonth', { price: '₹100' })}
              </Text>
            </View>
          </View>
        )}
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
        {/* Header: crown tile + title/subtitle + PRO chip */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.crownTileCard}>
            <Ionicons name={"crown" as any} size={24} color={colors.white} />
          </View>
          <View style={styles.cardHeaderTextCol}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{t('profile.upgradeTitle')}</Text>
              <View style={styles.proChipDark}>
                <Text style={styles.proChipTextDark}>PRO</Text>
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
                <Ionicons name="checkmark" size={12} color={colors.white} />
              </View>
              <Text style={styles.featText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* Footer: anchor pricing + primary CTA */}
        <View style={styles.cardFooter}>
          <View style={styles.cardPriceBlock}>
            <Text style={styles.cardPriceLabel}>{t('profile.startingFromLabel')}</Text>
            <Text style={styles.cardPrice}>{t('profile.pricePerMonth')}</Text>
          </View>
          <ActionButton
            buttonTitle={t('profile.viewPlans')}
            buttonTitleColor={colors.white}
            backgroundColor={profileColors.purple}
            onPress={onPress ?? noop}
            style={styles.cardCta}
            showRightArrow
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};


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
    backgroundColor: profileColors.purpleBadgeSoft,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: profileColors.purpleBorder,
  },
  proChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.white,
  },
  proChipTextDark: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: profileColors.purpleBadgeInk,
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

  /* Expanded compact banner (taller state) */
  compactBannerExpanded: {
    paddingBottom: spacing.lg,
  },
  expandChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  expandedBody: {
    marginTop: spacing.md,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  benefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  benefitText: {
    fontSize: 11,
    color: colors.white,
    marginLeft: 4,
  },
  expandedCta: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowOpacity: 0,
    elevation: 0,
  },

  /* ---------- card variant (profile screen) ---------- */
  cardWrap: {},
  card: {
    overflow: 'hidden',
    backgroundColor: profileColors.purpleSoft,
    borderWidth: 1,
    borderColor: profileColors.purpleBorder,
    borderRadius: 18,
    padding: 14,
    shadowColor: profileColors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crownTileCard: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: profileColors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    color: profileColors.purpleInk,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: profileColors.purpleMuted,
    marginTop: 3,
  },
  featureList: {
    marginTop: 14,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  featCheck: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: profileColors.check,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  featText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: profileColors.ink,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: profileColors.purpleDivider,
    paddingTop: 12,
    marginTop: 5,
  },
  cardPriceBlock: {
    flexShrink: 1,
  },
  cardPriceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: profileColors.purplePrice,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: profileColors.purplePrice,
    marginTop: 2,
  },
  cardCta: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 10,
    shadowOpacity: 0,
    elevation: 0,
  },
});
export default UpgradeProBanner;
