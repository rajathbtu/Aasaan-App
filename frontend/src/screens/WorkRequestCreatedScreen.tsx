import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '../i18n';
import { consumerFonts, spacing } from '../theme';
import type { ConsumerPalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';
import { buildTimeAgo } from '../utils/commonUtils';
import { resolveServiceIconName } from '../utils/serviceIcon';
import SvgIcon from '../assets/icons';
import ActionButton from '../components/ActionButton';
import { BrandWord } from '../components/BrandWord';

/**
 * Confirmation screen displayed after a work request has been created.
 *
 * Implemented 1:1 from Work_Request_Created_Confirmation_Handoff
 * (approved_final_design.png + index.html + styles.css). The handoff
 * prototype renders a 1024 × 1536 design canvas scaled to the viewport
 * width (`scale = innerWidth / 1024` in app.js); the same proportional
 * scaling is used here for every LAYOUT metric (card sizes, radii,
 * paddings, gaps, artwork, icon backplates) — identical to the
 * WorkRequestDetailsScreen convention.
 *
 * Typography uses the app's standard, cross-screen type scale (hero 25,
 * card/section titles 19, body 14, meta 13, captions 12.5 — the same
 * values as WorkRequestsScreen / WorkRequestDetailsScreen /
 * BoostRequestScreen) so text size stays consistent across the app.
 *
 * Structure per the approved design: brand wordmark header with circular
 * close, success hero with the celebratory check artwork, request summary
 * card with Live pill, read-only Request Location panel, share /
 * view-my-requests action row, ONE horizontal three-step "What happens
 * next?" section with numbered mint backplates and chevron arrows, and
 * the mint boost banner with the approved rocket artwork.
 */
const WorkRequestCreatedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useI18n();
  const { consumer: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  /* Handoff canvas scale — identical to fitCanvas() in the prototype's app.js.
     Applied to layout metrics only; typography uses the standard app scale. */
  const s = windowWidth / 1024;
  const timeAgo = buildTimeAgo(t);
  const { request, locationName: locationNameParam, serviceName: serviceNameParam } = (route.params as any) || {};
  const displayRequest = request && {
    ...request,
    serviceName: request.serviceName || serviceNameParam || request.service || 'Service',
    locationName: locationNameParam ?? request.locationName,
  };

  const isLive = request?.status === 'active' || request?.status === 'live';
  /* The API returns serviceIcon as a Material icon NAME (e.g. "construct"),
     not an image URL — only render it as an image when it is a real URL;
     otherwise fall back to the resolved category SVG icon (same treatment
     as the My Requests list cards). */
  const serviceIconUrl =
    typeof displayRequest?.serviceIcon === 'string' && /^(https?:|data:)/.test(displayRequest.serviceIcon)
      ? displayRequest.serviceIcon
      : null;
  const serviceIconName = resolveServiceIconName(displayRequest?.serviceName);
  const createdLabel = t('createRequest.created.createdBadge');
  const relativeCreated = timeAgo(request?.createdAt);
  const createdTimeLabel = relativeCreated
    ? `Requested ${relativeCreated}`
    : 'Requested just now';

  usePreventRemove(true, () => {
    navigation.navigate('Main', { screen: 'Create' });
  });

  const goToMyRequests = () => {
    navigation.navigate('Main', { screen: 'MyRequests' });
  };

  const closeScreen = () => {
    navigation.navigate('Main', { screen: 'Create' });
  };

  const handleShare = () => {
    const shareText = `${displayRequest?.serviceName || t('createRequest.created.titleBefore')} ${
      createdLabel
    } - ${displayRequest?.locationName || ''}`;
    Share.share({ message: shareText }).catch(() => {
      // sharing cancelled or failed — silent no-op
    });
  };

  const handleBoost = () => {
    navigation.navigate('BoostRequest', { request });
  };

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../assets/images/success_check_illustration.png')}
          style={styles.emptyArt}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        <Text style={styles.emptyTitle}>{t('createRequest.created.title')}</Text>
        <ActionButton
          fullWidth
          buttonTitle={t('createRequest.created.viewMyRequests')}
          buttonTitleColor={C.onPrimary}
          backgroundColor={C.primary}
          onPress={goToMyRequests}
          style={styles.primaryButton}
        />
      </View>
    );
  }

  const nextSteps = [
    { n: '1', icon: 'bell' as const, title: t('createRequest.created.step1Title'), desc: t('createRequest.created.step1Desc') },
    { n: '2', icon: 'chat-dots' as const, title: t('createRequest.created.step2Title'), desc: t('createRequest.created.step2Desc') },
    { n: '3', icon: 'handshake' as const, title: t('createRequest.created.step3Title'), desc: t('createRequest.created.step3Desc') },
  ];

  return (
    <View style={styles.root}>
      {/* Canvas background: was linear-gradient(125deg,#F8FBFF 0%,#F3FBF8 55%,#F0FBF7 100%) —
          the three stops are sub-perceptually different, so all map to C.page. */}
      <LinearGradient
        colors={[C.page, C.page, C.page]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Custom brand header: wordmark left, circular white close right */}
        <View style={styles.headerRow}>
          <BrandWord style={styles.brandWordmark} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeScreen}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <SvgIcon name="close" size={18} color={C.ink} />
          </TouchableOpacity>
        </View>

        {/* Success hero: copy left, approved celebratory check artwork right */}
        <View style={styles.heroContainer}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {t('createRequest.created.titleBefore')}{' '}
              <Text style={styles.heroTitleCreated}>{createdLabel}</Text>
              <Text>{' 🎉'}</Text>
            </Text>
            <Text style={styles.heroSubtitle}>{t('createRequest.created.subtitle')}</Text>
          </View>
          <Image
            source={require('../assets/images/success_check_illustration.png')}
            style={[styles.heroArt, { width: 385 * s, height: 302 * s }]}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* Request summary card */}
        <View style={[styles.requestCard, { borderRadius: 38 * s, marginTop: 26 * s, padding: 26 * s }]}>
          <View style={styles.serviceRow}>
            <View style={[styles.serviceImage, { width: 200 * s, height: 158 * s, borderRadius: 29 * s }]}>
              {serviceIconUrl ? (
                <Image
                  source={{ uri: serviceIconUrl }}
                  style={styles.serviceArtImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <SvgIcon name={serviceIconName} size={42} color={C.primary} />
              )}
            </View>
            <View style={[styles.verticalRule, { height: 126 * s, marginHorizontal: 31 * s }]} />
            <View style={styles.serviceCopy}>
              <Text style={styles.requestTitle} numberOfLines={2} ellipsizeMode="tail">
                {displayRequest.serviceName}
              </Text>
              <Text style={styles.requestCategory}>Service Request</Text>
              <View style={styles.metaRow}>
                <SvgIcon name="clock" size={14} color={C.muted} style={{ marginRight: 6 }} />
                <Text style={styles.metaText}>{createdTimeLabel}</Text>
              </View>
            </View>
            {isLive && (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            )}
          </View>
        </View>

        {/* Request location panel — read-only, label + saved address */}
        {/* Mint gradient panel — mapped to the family's mint→mintDeep pair
            (was #E6F8F0 → #DDF8EC, sub-perceptual shift). */}
        <LinearGradient
          colors={[C.mint, C.mintDeep]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.locationRow, { borderRadius: 29 * s, minHeight: 98 * s, marginTop: 26 * s, paddingHorizontal: 31 * s, gap: 30 * s }]}
        >
          <View style={[styles.locationIcon, { width: 72 * s, height: 72 * s, borderRadius: 36 * s }]}>
            <SvgIcon name="location" size={Math.max(36 * s, 18)} color={C.primary} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>{t('createRequest.created.locationLabel')}</Text>
            <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">
              {displayRequest.locationName || t('userRequests.locationFallback')}
            </Text>
          </View>
          <SvgIcon name="chevron" size={15} color={C.cardMeta} style={{ transform: [{ rotate: '90deg' }] }} />
        </LinearGradient>

        {/* Action row: Share Request + View My Requests */}
        <View style={[styles.actionRow, { marginTop: 24 * s, gap: 29 * s }]}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
            <SvgIcon name="share" size={17} color={C.ink} style={{ marginRight: 8 }} />
            <Text style={styles.shareTitle}>{t('createRequest.created.shareRequest')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToMyRequests} activeOpacity={0.8} style={styles.viewRequestsTouch}>
            <LinearGradient
              colors={[C.ctaStart, C.ctaEnd]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.viewRequestsButton}
            >
              <SvgIcon name="list" size={16} color={C.onPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.viewRequestsTitle} numberOfLines={1}>
                {t('createRequest.created.viewMyRequests')}
              </Text>
              <SvgIcon name="chevron" size={14} color={C.onPrimary} style={{ transform: [{ rotate: '90deg' }] }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* What happens next? — single horizontal three-step process */}
        <View style={[styles.nextCard, { borderRadius: 38 * s, marginTop: 34 * s, paddingHorizontal: 34 * s, paddingVertical: 22 * s }]}>
          <Text style={styles.nextTitle}>{t('createRequest.created.nextTitle')}</Text>
          <View style={styles.stepsGrid}>
            {nextSteps.map((step, index) => (
              <React.Fragment key={step.n}>
                {index > 0 && (
                  <View style={[styles.stepArrowSlot, { marginTop: 34 * s, width: 28 * s + 6 }]}>
                    <SvgIcon name="chevron" size={Math.max(29 * s, 14)} color={C.muted} />
                  </View>
                )}
                <View style={styles.stepColumn}>
                  <View style={[styles.stepIconPlate, { width: 96 * s, height: 96 * s, borderRadius: 48 * s }]}>
                    <SvgIcon name={step.icon} size={Math.max(49 * s, 22)} color={C.deepGreen} />
                    <View style={[styles.stepBadge, { width: Math.max(36 * s, 16), height: Math.max(36 * s, 16), borderRadius: Math.max(18 * s, 8) }]}>
                      <Text style={[styles.stepBadgeText, { fontSize: Math.max(22 * s, 10) }]}>{step.n}</Text>
                    </View>
                  </View>
                  <Text style={styles.stepTitle} numberOfLines={2} ellipsizeMode="tail">
                    {step.title}
                  </Text>
                  <Text style={styles.stepDesc} numberOfLines={3} ellipsizeMode="tail">
                    {step.desc}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Boost banner — mint gradient banner with approved rocket artwork;
            the Boost action sits below the copy so the title and subtitle
            keep the full text width (per approved layout feedback). */}
        <LinearGradient
          colors={[C.heroMintStart, C.heroMintMid]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.boostBanner, { borderRadius: 38 * s, marginTop: 30 * s }]}
        >
          <Image
            source={require('../assets/images/boost_rocket_illustration.png')}
            style={[styles.boostRocket, { width: 225 * s, height: 165 * s }]}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
          <View style={styles.boostCopy}>
            <Text style={styles.boostTitle}>{t('createRequest.created.boostTitle')}</Text>
            <Text style={styles.boostSubtitle} numberOfLines={2} ellipsizeMode="tail">
              {t('createRequest.created.boostSubtitle')}
            </Text>
            <TouchableOpacity style={styles.boostButton} onPress={handleBoost} activeOpacity={0.7}>
              <SvgIcon name="bolt" size={14} color={C.primary} style={{ marginRight: 6 }} />
              <Text style={styles.boostButtonTitle} numberOfLines={1} ellipsizeMode="tail">
                {t('createRequest.created.boostButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
};

/* ── Layout geometry is applied inline with the canvas scale s (see header
      comment); typography stays on the fixed cross-screen app scale. ── */

const makeStyles = (C: ConsumerPalette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.page,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.page,
    paddingHorizontal: spacing.lg,
  },
  emptyArt: {
    width: 140,
    height: 110,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 6,
  },
  brandWordmark: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1.1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  /* Hero */
  heroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 10,
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 25,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    lineHeight: 31,
    letterSpacing: -0.9,
    marginBottom: 8,
  },
  heroTitleCreated: {
    color: C.primary,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    lineHeight: 20,
  },
  heroArt: {
    flexShrink: 0,
  },
  /* Request summary card */
  requestCard: {
    // Was rgba(255,255,255,0.94): the 6% translucency is sub-perceptual and
    // has no token; the opaque card token keeps dark mode readable.
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: spacing.lg,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  serviceArtImage: {
    width: '100%',
    height: '100%',
  },
  verticalRule: {
    width: 1.5,
    backgroundColor: C.profileBorder,
    flexShrink: 0,
  },
  serviceCopy: {
    flex: 1,
    minWidth: 0,
  },
  requestTitle: {
    fontSize: 19,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    lineHeight: 23,
    marginBottom: 4,
  },
  requestCategory: {
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    fontFamily: consumerFonts.regular,
    color: C.muted,
  },
  livePill: {
    backgroundColor: C.statusBg,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.statusDot,
    marginRight: 6,
  },
  liveText: {
    fontSize: 12.5,
    fontFamily: consumerFonts.bold,
    color: C.statusText,
  },
  /* Location panel */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationIcon: {
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  locationLabel: {
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    lineHeight: 15,
  },
  locationAddress: {
    fontSize: 15,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    lineHeight: 19,
  },
  /* Action row */
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.profileBorder,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 2,
  },
  shareTitle: {
    fontSize: 14.5,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    flexShrink: 1,
  },
  viewRequestsTouch: {
    flex: 1,
  },
  viewRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: C.shadowTint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 17,
    elevation: 4,
  },
  viewRequestsTitle: {
    fontSize: 14.5,
    fontFamily: consumerFonts.bold,
    color: C.onPrimary,
    marginRight: 6,
    flexShrink: 1,
  },
  /* What's Next card — horizontal three-step grid */
  nextCard: {
    // Was rgba(255,255,255,0.92): see requestCard note.
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: spacing.lg,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  nextTitle: {
    fontSize: 19,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    marginBottom: spacing.md,
  },
  stepsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepColumn: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 8,
  },
  stepArrowSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIconPlate: {
    backgroundColor: C.statusBg,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontFamily: consumerFonts.bold,
    color: C.onPrimary,
  },
  stepTitle: {
    fontSize: 13.5,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    lineHeight: 17,
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 12,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    lineHeight: 15.5,
  },
  /* Boost banner */
  boostBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    // 8%-alpha brand-green hairline: kept literal — translucent tint has no token.
    borderColor: 'rgba(10,158,99,0.08)',
  },
  boostRocket: {
    alignSelf: 'flex-end',
    flexShrink: 0,
  },
  boostCopy: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1.5,
    borderLeftColor: C.heroMintEnd,
    paddingLeft: 12,
    paddingVertical: 12,
  },
  boostTitle: {
    fontSize: 15,
    fontFamily: consumerFonts.bold,
    color: C.primaryDark,
    marginBottom: 3,
  },
  boostSubtitle: {
    fontSize: 12,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    lineHeight: 16,
  },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    // Was rgba(255,255,255,0.72): see requestCard note.
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.deepGreen,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 9,
  },
  boostButtonTitle: {
    fontSize: 12.5,
    fontFamily: consumerFonts.bold,
    color: C.primaryDark,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    width: '100%',
  },
});

export default WorkRequestCreatedScreen;
