import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Share } from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { useI18n } from '../i18n';
import { consumerColors, consumerFonts, spacing } from '../theme';
import { buildTimeAgo } from '../utils/commonUtils';
import { resolveServiceIconName } from '../utils/serviceIcon';
import SvgIcon from '../assets/icons';
import ActionButton from '../components/ActionButton';

/**
 * Confirmation screen displayed after a work request has been created.
 * Matches the approved Work_Request_Success_Handoff design exactly:
 * brand wordmark header with circular close, success hero with the
 * celebratory check badge, request summary card, mint service-location
 * row, share / view-my-requests action row, the single vertical
 * "What happens next?" three-step timeline and the mint boost banner.
 * There is deliberately no horizontal status timeline.
 */
const WorkRequestCreatedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useI18n();
  const timeAgo = buildTimeAgo(t);
  const { request, locationName: locationNameParam, serviceName: serviceNameParam } = (route.params as any) || {};
  const displayRequest = request && {
    ...request,
    serviceName: request.serviceName || serviceNameParam || request.service || 'Service',
    locationName: locationNameParam ?? request.locationName,
  };

  const isLive = request?.status === 'active' || request?.status === 'live';
  const serviceIcon = displayRequest?.serviceIcon;
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
        <SuccessBadgeArt />
        <Text style={styles.emptyTitle}>{t('createRequest.created.title')}</Text>
        <ActionButton
          fullWidth
          buttonTitle={t('createRequest.created.viewMyRequests')}
          buttonTitleColor={consumerColors.white}
          backgroundColor={consumerColors.primary}
          onPress={goToMyRequests}
          style={styles.primaryButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Custom brand header: wordmark left, close button right */}
      <View style={styles.headerRow}>
        <Text style={styles.brandWordmark}>aasaanly</Text>
        <TouchableOpacity style={styles.closeButton} onPress={closeScreen} activeOpacity={0.7}>
          <SvgIcon name="close" size={18} color={consumerColors.ink} />
        </TouchableOpacity>
      </View>

      {/* Success hero: copy left, celebratory check badge right */}
      <View style={styles.heroContainer}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {t('createRequest.created.titleBefore')}{' '}
            <Text style={styles.heroTitleCreated}>{createdLabel}</Text>
            <Text>{' 🎉'}</Text>
          </Text>
          <Text style={styles.heroSubtitle}>{t('createRequest.created.subtitle')}</Text>
        </View>
        <View style={styles.heroArtContainer}>
          <SvgXml xml={SUCCESS_BADGE_SVG} width={124} height={124} style={{ flexShrink: 0 }} />
        </View>
      </View>

      {/* Request summary card */}
      <View style={styles.requestCard}>
        <View style={styles.serviceRow}>
          <View style={styles.serviceImage}>
            {serviceIcon ? (
              <Image
                source={{ uri: serviceIcon }}
                style={styles.serviceArtImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <SvgIcon name={serviceIconName} size={42} color={consumerColors.primary} />
            )}
          </View>
          <View style={styles.verticalRule} />
          <View style={styles.serviceCopy}>
            <Text style={styles.requestTitle} numberOfLines={2} ellipsizeMode="tail">
              {displayRequest.serviceName}
            </Text>
            <Text style={styles.requestCategory}>Service Request</Text>
            <View style={styles.metaRow}>
              <SvgIcon name="clock" size={14} color={consumerColors.muted} style={{ marginRight: 6 }} />
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

      {/* Service location row */}
      <View style={styles.locationRow}>
        <View style={styles.locationIcon}>
          <SvgIcon name="location" size={17} color={consumerColors.primary} />
        </View>
        <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">
          {displayRequest.locationName || t('userRequests.locationFallback')}
        </Text>
        <View style={styles.locationChevronWrap}>
          <SvgIcon name="chevron" size={15} color={consumerColors.muted} style={{ transform: [{ rotate: '90deg' }] }} />
        </View>
      </View>

      {/* Action row: Share Request + View My Requests */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
          <SvgIcon name="share" size={17} color={consumerColors.ink} style={{ marginRight: 8 }} />
          <Text style={styles.shareTitle}>{t('createRequest.created.shareRequest')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToMyRequests} activeOpacity={0.8} style={styles.viewRequestsTouch}>
          <LinearGradient
            colors={[consumerColors.primary, consumerColors.primaryDark]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.viewRequestsButton}
          >
            <SvgIcon name="list" size={16} color={consumerColors.white} style={{ marginRight: 8 }} />
            <Text style={styles.viewRequestsTitle}>{t('createRequest.created.viewMyRequests')}</Text>
            <SvgIcon name="chevron" size={14} color={consumerColors.white} style={{ transform: [{ rotate: '90deg' }] }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* What's Next? — single vertical three-step timeline */}
      <View style={styles.nextCard}>
        <Text style={styles.nextTitle}>{t('createRequest.created.nextTitle')}</Text>
        <View style={styles.stepsList}>
          {/* Thin mint connector joining the three numbered circles */}
          <View style={styles.stepsConnector} pointerEvents="none" />
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepIconTile}>
              <SvgIcon name="bell" size={19} color={consumerColors.primary} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle} numberOfLines={2} ellipsizeMode="tail">
                {t('createRequest.created.step1Title')}
              </Text>
              <Text style={styles.stepDesc} numberOfLines={2} ellipsizeMode="tail">
                {t('createRequest.created.step1Desc')}
              </Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepIconTile}>
              <SvgIcon name="chat-dots" size={19} color={consumerColors.primary} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle} numberOfLines={2} ellipsizeMode="tail">
                {t('createRequest.created.step2Title')}
              </Text>
              <Text style={styles.stepDesc} numberOfLines={2} ellipsizeMode="tail">
                {t('createRequest.created.step2Desc')}
              </Text>
            </View>
          </View>
          <View style={[styles.stepItem, styles.stepItemLast]}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepIconTile}>
              <SvgIcon name="handshake" size={19} color={consumerColors.primary} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle} numberOfLines={2} ellipsizeMode="tail">
                {t('createRequest.created.step3Title')}
              </Text>
              <Text style={styles.stepDesc} numberOfLines={2} ellipsizeMode="tail">
                {t('createRequest.created.step3Desc')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Boost banner — mint rounded banner with rocket */}
      <View style={styles.boostBanner}>
        <View style={styles.boostRocket}>
          <SvgXml xml={BOOST_ROCKET_SVG} width={58} height={50} style={{ flexShrink: 0 }} />
        </View>
        <View style={styles.boostDivider} />
        <View style={styles.boostCopy}>
          <Text style={styles.boostTitle} numberOfLines={1} ellipsizeMode="tail">
            {t('createRequest.created.boostTitle')}
          </Text>
          <Text style={styles.boostSubtitle} numberOfLines={2} ellipsizeMode="tail">
            {t('createRequest.created.boostSubtitle')}
          </Text>
        </View>
        <TouchableOpacity style={styles.boostButton} onPress={handleBoost} activeOpacity={0.7}>
          <SvgIcon name="bolt" size={14} color={consumerColors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.boostButtonTitle} numberOfLines={1}>
            {t('createRequest.created.boostButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const CARD_RADIUS = 20;

/* ── Illustrations (inline SVG matched to the approved handoff assets) ── */

/* Celebratory green check badge with confetti — approved success hero. */
const SUCCESS_BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" role="img" aria-labelledby="t d"><title id="t">Request created</title><desc id="d">A green celebratory check badge with confetti.</desc><defs><linearGradient id="seal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2BC48A"/><stop offset="1" stop-color="#0A9C5C"/></linearGradient></defs><ellipse cx="110" cy="205" rx="62" ry="10" fill="#DDF3E7"/><g stroke-linecap="round" stroke-width="7" fill="none"><path d="M30 60l12 12" stroke="#F2C230"/><path d="M190 56l-12 13" stroke="#F2C230"/><path d="M22 128h16" stroke="#19B978"/><path d="M182 132h16" stroke="#19B978"/><path d="M64 24l7 14" stroke="#19B978"/><path d="M158 22l-6 15" stroke="#F2C230"/><path d="M108 10v14" stroke="#F2C230"/></g><g fill="url(#seal)"><circle cx="110" cy="46" r="26"/><circle cx="149" cy="57" r="26"/><circle cx="170" cy="94" r="26"/><circle cx="170" cy="138" r="26"/><circle cx="149" cy="175" r="26"/><circle cx="110" cy="186" r="26"/><circle cx="71" cy="175" r="26"/><circle cx="50" cy="138" r="26"/><circle cx="50" cy="94" r="26"/><circle cx="71" cy="57" r="26"/><circle cx="110" cy="116" r="72"/></g><path d="m76 118 24 24 46-52" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const BOOST_ROCKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190" role="img" aria-labelledby="t d"><title id="t">Boost request rocket</title><desc id="d">A green and white rocket launching upward from soft clouds.</desc><defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#DDF7EA"/></linearGradient><linearGradient id="flame" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFD45A"/><stop offset="1" stop-color="#F28B25"/></linearGradient></defs><path d="M88 151c-21 10-33 25-39 39 22-3 39-13 50-29" fill="#0DAB68"/><path d="M127 137c10 20 26 30 45 34-4-22-14-37-31-47" fill="#16B978"/><g transform="rotate(34 111 87)"><path d="M111 12C75 44 75 91 91 127h40c16-36 16-83-20-115Z" fill="url(#body)" stroke="#0A9B60" stroke-width="5"/><path d="M91 96h40v31H91Z" fill="#13B978"/><circle cx="111" cy="68" r="15" fill="#DDF7EA" stroke="#079B60" stroke-width="7"/><path d="M91 126 111 167l20-41Z" fill="url(#flame)"/></g><path d="M20 170c12-20 35-21 48-7 15-22 44-16 50 6 20-7 35 4 37 17H20Z" fill="#fff" opacity=".95"/></svg>`;

/* Renders the success badge in the no-request fallback state. */
const SuccessBadgeArt: React.FC = () => <SvgXml xml={SUCCESS_BADGE_SVG} width={140} height={140} style={{ marginBottom: spacing.lg }} />;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: consumerColors.page,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: consumerColors.page,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: consumerColors.page,
  },
  brandWordmark: {
    fontSize: 28,
    fontFamily: consumerFonts.bold,
    color: consumerColors.primary,
    letterSpacing: -1.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: consumerColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: consumerColors.border,
  },
  /* Hero */
  heroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 25,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    lineHeight: 31,
    letterSpacing: -0.9,
    marginBottom: 8,
  },
  heroTitleCreated: {
    color: consumerColors.primary,
  },
  heroSubtitle: {
    fontSize: 14.5,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    lineHeight: 21,
  },
  heroArtContainer: {
    width: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Request summary card */
  requestCard: {
    backgroundColor: consumerColors.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: consumerColors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  serviceImage: {
    width: 78,
    height: 78,
    borderRadius: 18,
    backgroundColor: consumerColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  serviceArtImage: {
    width: '100%',
    height: '100%',
  },
  verticalRule: {
    width: 1,
    height: 62,
    backgroundColor: '#E2EAE5',
  },
  serviceCopy: {
    flex: 1,
    minWidth: 0,
  },
  requestTitle: {
    fontSize: 19,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    lineHeight: 23,
    marginBottom: 4,
  },
  requestCategory: {
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
  },
  livePill: {
    backgroundColor: consumerColors.statusBg,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: consumerColors.statusDot,
    marginRight: 6,
  },
  liveText: {
    fontSize: 12.5,
    fontFamily: consumerFonts.bold,
    color: consumerColors.statusText,
  },
  /* Location row */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: consumerColors.locationBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: consumerColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  locationAddress: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
  },
  locationChevronWrap: {
    marginLeft: 8,
  },
  /* Action row */
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: 10,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: consumerColors.white,
    borderWidth: 1,
    borderColor: '#E1E7EE',
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shareTitle: {
    fontSize: 14.5,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
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
    shadowColor: consumerColors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  viewRequestsTitle: {
    fontSize: 14.5,
    fontFamily: consumerFonts.bold,
    color: consumerColors.white,
    marginRight: 6,
  },
  /* What's Next card */
  nextCard: {
    backgroundColor: consumerColors.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: consumerColors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  nextTitle: {
    fontSize: 19,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    marginBottom: spacing.lg,
  },
  stepsList: {
    position: 'relative',
  },
  stepsConnector: {
    position: 'absolute',
    left: 12,
    top: 14,
    bottom: 26,
    width: 2,
    borderRadius: 1,
    backgroundColor: '#CDEEDF',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepItemLast: {
    marginBottom: 0,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: consumerColors.selectedMint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: 13.5,
    fontFamily: consumerFonts.bold,
    color: consumerColors.primaryDark,
  },
  stepIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: consumerColors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    lineHeight: 18,
  },
  /* Boost banner */
  boostBanner: {
    backgroundColor: '#E9F8F0',
    borderRadius: CARD_RADIUS,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#DDF2E6',
  },
  boostRocket: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostDivider: {
    width: 1,
    height: 46,
    backgroundColor: '#D5EFE2',
  },
  boostCopy: {
    flex: 1,
    minWidth: 0,
  },
  boostTitle: {
    fontSize: 15,
    fontFamily: consumerFonts.bold,
    color: consumerColors.primary,
    marginBottom: 2,
  },
  boostSubtitle: {
    fontSize: 12,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    lineHeight: 17,
  },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: consumerColors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  boostButtonTitle: {
    fontSize: 12.5,
    fontFamily: consumerFonts.bold,
    color: consumerColors.primary,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    width: '100%',
  },
});

export default WorkRequestCreatedScreen;
