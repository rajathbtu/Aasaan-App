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
import RequestTags from '../components/RequestTags';

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
 * Structure: brand wordmark header with circular close, success hero with
 * the celebratory check artwork, request summary card using the same layout
 * and UI as the WorkRequestDetailsScreen request card (circular service
 * art, title, category, tag chips, time and location rows, decorative mint
 * wash), share / view-my-requests action row, ONE horizontal three-step
 * "What happens next?" section with numbered mint backplates and chevron
 * arrows, and the mint boost banner with the approved rocket artwork.
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
  /* The request card reuses the WorkRequestDetailsScreen layout 1:1, which is
     drawn on a 941px handoff canvas — the card is scaled with the same 941px
     factor so it renders identically to the details screen. */
  const cardS = windowWidth / 941;
  const timeAgo = buildTimeAgo(t);
  const { request, locationName: locationNameParam, serviceName: serviceNameParam } = (route.params as any) || {};
  const displayRequest = request && {
    ...request,
    serviceName: request.serviceName || serviceNameParam || request.service || 'Service',
    locationName: locationNameParam ?? request.locationName,
  };

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
  /* Card content mirrors WorkRequestDetailsScreen: title, category, tags,
     relative time and location rows. */
  const cardTitle = displayRequest?.title || displayRequest?.serviceName;
  const cardLocationName =
    displayRequest?.locationName || displayRequest?.location?.name || t('userRequests.locationFallback');
  const cardTimeLabel = timeAgo(request?.createdAt) || t('common.relative.justNow');

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
          source={require('../assets/illustrations/success_check_illustration.png')}
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

        {/* Success hero: one compact block — copy left (two-line title +
            subtitle), celebratory check artwork right, vertically centered.
            The artwork is canvas-scaled small enough that the 25px title
            keeps one line per line on every common phone width. */}
        <View style={styles.heroContainer}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {t('createRequest.created.titleBefore')}
              {'\n'}
              <Text style={styles.heroTitleCreated}>{createdLabel}</Text>
              <Text>{' 🎉'}</Text>
            </Text>
            <Text style={styles.heroSubtitle}>{t('createRequest.created.subtitle')}</Text>
          </View>
          <Image
            source={require('../assets/illustrations/success_check_illustration.png')}
            style={[styles.heroArt, { width: 270 * s, height: 212 * s }]}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* Request summary card — same layout and UI as the
            WorkRequestDetailsScreen request card: circular service art,
            title, category, tag chips, time and location rows, and the
            decorative mint wash. Drawn with the details screen's 941px
            canvas scale (cardS) so it is pixel-identical. */}
        <View
          style={[
            styles.requestCard,
            { marginTop: 26 * s, borderRadius: 28 * cardS, padding: 22 * cardS, gap: 22 * cardS },
          ]}
        >
          {/* Decorative translucent mint wash behind the service art — kept as
              rgba literals: an alpha-blended glow has no palette token. */}
          <LinearGradient
            colors={['rgba(218,250,237,0.04)', 'rgba(166,242,213,0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              right: -120 * cardS,
              top: 100 * cardS,
              width: 380 * cardS,
              height: 160 * cardS,
              borderRadius: 190 * cardS,
              transform: [{ rotate: '-24deg' }],
            }}
            pointerEvents="none"
          />
          <View style={[styles.serviceImage, { width: 190 * cardS, height: 190 * cardS, borderRadius: 95 * cardS }]}>
            {serviceIconUrl ? (
              <Image
                source={{ uri: serviceIconUrl }}
                style={styles.serviceImageArt}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <SvgIcon
                name={serviceIconName}
                size={190 * cardS * 0.42}
                color={displayRequest?.serviceColor || C.deepGreen}
              />
            )}
          </View>
          <View style={styles.requestContent}>
            {/* Title is always fully expanded — no Show more/less. */}
            <Text style={[styles.requestTitle, { marginTop: 4 * cardS }]}>
              {cardTitle}
            </Text>
            <Text style={styles.requestCategory} numberOfLines={2}>
              {displayRequest.serviceName}
            </Text>
            {displayRequest.tags && displayRequest.tags.length > 0 && (
              /* Tags selected on the request (folded into +N after three). */
              <RequestTags
                tags={displayRequest.tags}
                rowStyle={styles.tagsRow}
                chipStyle={styles.tagChip}
                chipTextStyle={styles.tagChipText}
                moreTextStyle={styles.tagChipMore}
              />
            )}
            <View style={[styles.time, { gap: 8 * cardS, marginBottom: 13 * cardS }]}>
              <SvgIcon name="clock" size={Math.max(19 * cardS, 13)} color={C.muted} />
              <Text style={styles.timeText} numberOfLines={1}>
                {cardTimeLabel}
              </Text>
            </View>
            <View style={[styles.location, { gap: 8 * cardS }]}>
              <SvgIcon name="location" size={Math.max(19 * cardS, 13)} color={C.muted} />
              <Text style={styles.timeText} numberOfLines={1} ellipsizeMode="tail">
                {cardLocationName}
              </Text>
            </View>
          </View>
        </View>

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
            source={require('../assets/illustrations/boost_rocket_illustration.png')}
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
  /* Hero — one compact block: copy left, artwork right, vertically
     centered so title, subtitle and image align as a single group. */
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
    marginBottom: 6,
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
  /* Request summary card — identical to the WorkRequestDetailsScreen
     request card (layout values applied inline with the 941px cardS scale;
     typography uses the same cross-screen type scale). */
  requestCard: {
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    shadowColor: '#1A364D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 5,
  },
  serviceImage: {
    backgroundColor: C.mintDeep,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  serviceImageArt: {
    width: '100%',
    height: '100%',
  },
  requestContent: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  requestTitle: {
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.3,
    fontFamily: consumerFonts.bold,
    color: C.ink,
    marginBottom: 4,
  },
  requestCategory: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    marginBottom: 7,
  },
  /* Request tags: soft chips, same look as the details screen card. */
  tagsRow: {
    marginTop: 2,
  },
  tagChip: {
    backgroundColor: C.page,
    borderColor: C.border,
  },
  tagChipText: {
    fontFamily: consumerFonts.regular,
    color: C.muted,
  },
  tagChipMore: {
    fontFamily: consumerFonts.bold,
    color: C.muted,
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    flexShrink: 1,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
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
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 12,
    fontFamily: consumerFonts.regular,
    color: C.muted,
    lineHeight: 15.5,
    textAlign: 'center',
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
