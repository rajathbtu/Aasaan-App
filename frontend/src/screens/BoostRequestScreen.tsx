import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { boostWorkRequest } from '../api';
import { createBoostPaymentOptions, verifyBoostPayment } from '../api/razorpay';
import { RazorpayWebPaymentOptions, RazorpayWebResponse } from '../api/razorpayWeb';
import RazorpayWebView from '../components/RazorpayWebView';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalLoader } from '../contexts/GlobalLoaderContext';
import { consumerColors, consumerFonts, spacing } from '../theme';
import { colors } from '../theme';
import { useI18n } from '../i18n';
import { buildTimeAgo } from '../utils/commonUtils';
import { resolveServiceIconName } from '../utils/serviceIcon';
import SvgIcon from '../assets/icons';

const MONEY_PRICE_INR = 100;
const CREDIT_COST = 100;

const BOOST_ROCKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190" role="img" aria-labelledby="t d"><title id="t">Boost request rocket</title><desc id="d">A green and white rocket launching upward from soft clouds.</desc><defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#DDF7EA"/></linearGradient><linearGradient id="flame" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFD45A"/><stop offset="1" stop-color="#F28B25"/></linearGradient></defs><path d="M88 151c-21 10-33 25-39 39 22-3 39-13 50-29" fill="#0DAB68"/><path d="M127 137c10 20 26 30 45 34-4-22-14-37-31-47" fill="#16B978"/><g transform="rotate(34 111 87)"><path d="M111 12C75 44 75 91 91 127h40c16-36 16-83-20-115Z" fill="url(#body)" stroke="#0A9B60" stroke-width="5"/><path d="M91 96h40v31H91Z" fill="#13B978"/><circle cx="111" cy="68" r="15" fill="#DDF7EA" stroke="#079B60" stroke-width="7"/><path d="M91 126 111 167l20-41Z" fill="url(#flame)"/></g><path d="M20 170c12-20 35-21 48-7 15-22 44-16 50 6 20-7 35 4 37 17H20Z" fill="#fff" opacity=".95"/></svg>`;

/**
 * Boost Request screen — matches the approved Boost_Request_Handoff design:
 * mint back-circle header, request summary card with pale-blue service art
 * and read-only location pill, mint gradient "Get More Responses / Faster!"
 * hero with rocket artwork, three benefit items with mint icon tiles,
 * payment option cards with radios and price pills, and a full-width green
 * gradient CTA. All existing payment/Razorpay business logic is preserved.
 */
const BoostRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { request } = (route.params as any) || {};
  const { token, user, refreshUser } = useAuth();
  const { t } = useI18n();
  const { showLoader, hideLoader } = useGlobalLoader();
  const timeAgo = buildTimeAgo(t);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'money' | 'credits'>('money');
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<RazorpayWebPaymentOptions | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string>('');

  const credits = user?.creditPoints ?? 0;
  const hasEnoughCredits = credits >= CREDIT_COST;

  const handleBoost = async (useCredits: boolean) => {
    if (!token || !request) return;

    setLoading(true);
    showLoader(t('loader.boosting'));

    try {
      if (useCredits) {
        await boostWorkRequest(token, request.id, useCredits);
        await refreshUser();
        Alert.alert(t('common.success'), t('boostRequest.successDesc'));
        navigation.navigate('Main', { screen: 'MyRequests' });
      } else {
        const userDetails = {
          email: '',
          contact: user?.phone || user?.phoneNumber || '',
          name: user?.name || '',
        };

        try {
          const { orderData, paymentOptions: options } = await createBoostPaymentOptions(
            token,
            request.id,
            userDetails
          );

          setPaymentOptions(options);
          setCurrentRequestId(request.id);
          setShowPaymentWebView(true);
          hideLoader();
        } catch (err: any) {
          console.error('Error creating payment options:', err);
          Alert.alert(t('common.error'), err.message || t('boostRequest.errorBoostFailed'));
        }
      }
    } catch (err: any) {
      console.error('Boost payment error:', err);

      if (err.code) {
        switch (err.code) {
          case 'BAD_REQUEST_ERROR':
            Alert.alert(t('common.error'), t('payment.badRequest'));
            break;
          case 'GATEWAY_ERROR':
            Alert.alert(t('common.error'), t('payment.gatewayError'));
            break;
          case 'NETWORK_ERROR':
            Alert.alert(t('common.error'), t('payment.networkError'));
            break;
          case 'SERVER_ERROR':
            Alert.alert(t('common.error'), t('payment.serverError'));
            break;
          default:
            Alert.alert(t('common.error'), err.description || t('boostRequest.errorBoostFailed'));
        }
      } else {
        Alert.alert(t('common.error'), err.message || t('boostRequest.errorBoostFailed'));
      }
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handlePaymentSuccess = async (response: RazorpayWebResponse) => {
    if (!token) return;

    setShowPaymentWebView(false);
    setLoading(true);
    showLoader(t('loader.processingPayment'));

    try {
      const verificationData = {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        requestId: currentRequestId,
      };

      const verificationResult = await verifyBoostPayment(token, verificationData);

      if (verificationResult.success) {
        await refreshUser();
        Alert.alert(
          t('common.success'),
          t('boostRequest.paymentSuccessDesc'),
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Main', { screen: 'MyRequests' }),
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('boostRequest.paymentFailedDesc'));
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      Alert.alert(t('common.error'), err.message || t('boostRequest.paymentFailedDesc'));
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handlePaymentError = (error: any) => {
    setShowPaymentWebView(false);
    console.error('Razorpay payment error:', error);

    if (error.code) {
      switch (error.code) {
        case 'BAD_REQUEST_ERROR':
          Alert.alert(t('common.error'), t('payment.badRequest'));
          break;
        case 'GATEWAY_ERROR':
          Alert.alert(t('common.error'), t('payment.gatewayError'));
          break;
        case 'NETWORK_ERROR':
          Alert.alert(t('common.error'), t('payment.networkError'));
          break;
        case 'SERVER_ERROR':
          Alert.alert(t('common.error'), t('payment.serverError'));
          break;
        default:
          Alert.alert(t('common.error'), error.description || t('boostRequest.errorBoostFailed'));
      }
    } else {
      Alert.alert(t('common.error'), error.description || error.message || t('boostRequest.errorBoostFailed'));
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentWebView(false);
  };

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('boostRequest.notFound')}</Text>
      </View>
    );
  }

  const alreadyBoosted = !!request.boosted;
  const serviceName = request.serviceName || request.service || t('boostRequest.title');
  const serviceIcon = request.serviceIcon;
  const serviceIconName = resolveServiceIconName(serviceName);
  const locationName = request.locationName || t('userRequests.locationFallback');
  const relativeCreated = timeAgo(request.createdAt);
  const createdTimeLabel = relativeCreated ? `Requested ${relativeCreated}` : 'Requested just now';

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) }]}>
      {/* Custom header: mint back circle + bold title */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <SvgIcon name="back" size={20} color={consumerColors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('boostRequest.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                <SvgIcon name={serviceIconName} size={46} color={consumerColors.primary} />
              )}
            </View>
            <View style={styles.verticalRule} />
            <View style={styles.requestCopy}>
              <Text style={styles.requestTitle} numberOfLines={2} ellipsizeMode="tail">
                {serviceName}
              </Text>
              <Text style={styles.requestCategory} numberOfLines={1} ellipsizeMode="tail">
                {serviceName}
              </Text>
              <View style={styles.timeRow}>
                <SvgIcon name="clock" size={14} color={consumerColors.muted} style={{ marginRight: 6 }} />
                <Text style={styles.timeText}>{createdTimeLabel}</Text>
              </View>
              {/* Read-only saved request location — no edit affordance */}
              <View style={styles.locationPill}>
                <SvgIcon name="location" size={14} color={consumerColors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                  {locationName}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Boost hero banner */}
        <LinearGradient
          colors={[consumerColors.heroMintStart, consumerColors.heroMintMid, consumerColors.heroMintEnd]}
          start={{ x: 0, y: 0.4 }}
          end={{ x: 1, y: 0.6 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.heroHeadline} numberOfLines={1} ellipsizeMode="tail">
              {t('boostRequest.heroTitle')}
            </Text>
            <Text style={styles.heroFaster} numberOfLines={1} ellipsizeMode="tail">
              {t('boostRequest.heroFaster')}
            </Text>
            <Text style={styles.heroText} numberOfLines={3} ellipsizeMode="tail">
              {t('boostRequest.heroBody')}
            </Text>
          </View>
          <View style={styles.heroRocketWrap}>
            <SvgXml xml={BOOST_ROCKET_SVG} width={112} height={97} style={{ flexShrink: 0 }} />
          </View>
        </LinearGradient>

        {/* Benefits section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>{t('boostRequest.benefitsHeading')}</Text>
          <View style={styles.benefitRow}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconTile}>
                <SvgIcon name="bolt" size={20} color={consumerColors.primary} />
              </View>
              <Text style={styles.benefitLabel} numberOfLines={2} ellipsizeMode="tail">
                {t('boostRequest.benefitVisibilityLabel')}
              </Text>
            </View>
            <View style={styles.benefitDivider} />
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconTile}>
                <SvgIcon name="trophy" size={20} color={consumerColors.primary} />
              </View>
              <Text style={styles.benefitLabel} numberOfLines={2} ellipsizeMode="tail">
                {t('boostRequest.benefitPlacementLabel')}
              </Text>
            </View>
            <View style={styles.benefitDivider} />
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconTile}>
                <SvgIcon name="badge" size={20} color={consumerColors.primary} />
              </View>
              <Text style={styles.benefitLabel} numberOfLines={2} ellipsizeMode="tail">
                {t('boostRequest.benefitUrgentBadgeLabel')}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment section */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>{t('boostRequest.paymentHeading')}</Text>

          <TouchableOpacity
            onPress={() => setSelectedOption('money')}
            disabled={alreadyBoosted}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedOption === 'money' }}
          >
            <View
              style={[
                styles.optionCard,
                selectedOption === 'money' ? styles.optionCardSelected : styles.optionCardIdle,
              ]}
            >
              <View style={[styles.radioOuter, selectedOption === 'money' && styles.radioOuterSelected]}>
                {selectedOption === 'money' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.paymentIconWrap}>
                <SvgIcon name="wallet" size={20} color={consumerColors.primary} />
              </View>
              <View style={styles.paymentCopy}>
                <Text style={styles.optionTitle} numberOfLines={1} ellipsizeMode="tail">
                  {t('boostRequest.payWithMoney')}
                </Text>
                <Text style={styles.optionSubtitle} numberOfLines={2} ellipsizeMode="tail">
                  {t('boostRequest.moneySubtitle')}
                </Text>
              </View>
              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>₹{MONEY_PRICE_INR}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedOption('credits')}
            disabled={!hasEnoughCredits || alreadyBoosted}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedOption === 'credits', disabled: !hasEnoughCredits }}
          >
            <View
              style={[
                styles.optionCard,
                selectedOption === 'credits' ? styles.optionCardSelected : styles.optionCardIdle,
                !hasEnoughCredits && styles.optionCardDisabled,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedOption === 'credits' && styles.radioOuterSelected,
                ]}
              >
                {selectedOption === 'credits' && <View style={styles.radioInner} />}
              </View>
              <View style={[styles.paymentIconWrap, !hasEnoughCredits && styles.paymentIconDisabled]}>
                <SvgIcon name="coins" size={20} color={hasEnoughCredits ? consumerColors.primary : '#5D687A'} />
              </View>
              <View style={styles.paymentCopy}>
                <Text style={styles.optionTitle} numberOfLines={1} ellipsizeMode="tail">
                  {t('boostRequest.useCredits')}
                </Text>
                <Text style={styles.optionSubtitle} numberOfLines={1} ellipsizeMode="tail">
                  {t('boostRequest.balance', { points: credits })}
                </Text>
                {!hasEnoughCredits && (
                  <Text style={styles.optionShortfall} numberOfLines={1} ellipsizeMode="tail">
                    {t('boostRequest.needMore', { diff: CREDIT_COST - credits })}
                  </Text>
                )}
              </View>
              <View style={styles.pointsPill}>
                <Text style={styles.pointsPillText}>{CREDIT_COST} pts</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Call to Action */}
        <TouchableOpacity
          onPress={() => handleBoost(selectedOption === 'credits')}
          disabled={loading || (selectedOption === 'credits' && !hasEnoughCredits) || alreadyBoosted}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[consumerColors.primary, consumerColors.primaryDark]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.ctaButton, (loading || alreadyBoosted || (selectedOption === 'credits' && !hasEnoughCredits)) && styles.ctaDisabled]}
          >
            <SvgIcon name="bolt" size={18} color={consumerColors.white} style={{ marginRight: 9 }} />
            <Text style={styles.ctaTitle} numberOfLines={1} ellipsizeMode="tail">
              {alreadyBoosted
                ? t('boostRequest.ctaAlreadyBoosted')
                : selectedOption === 'credits'
                ? t('boostRequest.ctaUseCredits')
                : t('boostRequest.ctaPayBoost', { price: MONEY_PRICE_INR })}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Razorpay WebView for payments */}
      {paymentOptions && (
        <RazorpayWebView
          visible={showPaymentWebView}
          options={paymentOptions}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={handlePaymentCancel}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: consumerColors.page,
  },
  scrollView: {
    flex: 1,
    backgroundColor: consumerColors.page,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 20,
  },
  /* Custom header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: consumerColors.page,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: consumerColors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    flex: 1,
  },
  headerSpacer: {},
  /* Request summary card */
  requestCard: {
    backgroundColor: consumerColors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: consumerColors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#1F4255',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  serviceImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: consumerColors.serviceArtBg,
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
    height: 84,
    backgroundColor: '#D5DDE6',
    flexShrink: 0,
  },
  requestCopy: {
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
    marginBottom: 7,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeText: {
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F8EF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 13,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    flexShrink: 1,
  },
  /* Boost hero banner */
  heroBanner: {
    borderRadius: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#178655',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroHeadline: {
    fontSize: 21,
    fontFamily: consumerFonts.bold,
    color: '#0B1426',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  heroFaster: {
    fontSize: 30,
    fontFamily: consumerFonts.bold,
    color: consumerColors.primary,
    fontStyle: 'italic',
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 13.5,
    fontFamily: consumerFonts.regular,
    color: '#334155',
    lineHeight: 19,
  },
  heroRocketWrap: {
    width: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Benefits section */
  benefitsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  benefitIconTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E4F8EF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  benefitLabel: {
    fontSize: 13,
    fontFamily: consumerFonts.bold,
    color: '#101827',
    flexShrink: 1,
  },
  benefitDivider: {
    width: 1.5,
    height: 40,
    backgroundColor: '#DCE4EC',
    marginHorizontal: 6,
  },
  /* Payment section */
  paymentSection: {
    marginBottom: spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  optionCardIdle: {
    backgroundColor: consumerColors.white,
    borderColor: '#E1E7EE',
  },
  optionCardSelected: {
    backgroundColor: consumerColors.paymentSelectedBg,
    borderColor: '#00B96B',
  },
  optionCardDisabled: {
    backgroundColor: '#F7F9FA',
    borderColor: '#E5E9EE',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: consumerColors.radioIdle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: consumerColors.white,
  },
  radioOuterSelected: {
    borderColor: consumerColors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: consumerColors.primary,
  },
  paymentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E7F8EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  paymentIconDisabled: {
    backgroundColor: '#F3F5F8',
  },
  paymentCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 15.5,
    fontFamily: consumerFonts.bold,
    color: consumerColors.ink,
    marginBottom: 3,
  },
  optionSubtitle: {
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    color: consumerColors.muted,
    lineHeight: 16,
  },
  optionShortfall: {
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    color: colors.error,
    lineHeight: 16,
    marginTop: 2,
  },
  pricePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: consumerColors.selectedMint,
    flexShrink: 0,
  },
  pricePillText: {
    fontSize: 14,
    fontFamily: consumerFonts.bold,
    color: consumerColors.primary,
  },
  pointsPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: consumerColors.pointsPillBg,
    flexShrink: 0,
  },
  pointsPillText: {
    fontSize: 14,
    fontFamily: consumerFonts.bold,
    color: consumerColors.pointsPillText,
  },
  /* CTA */
  ctaButton: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: consumerColors.primaryDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaTitle: {
    fontSize: 16,
    fontFamily: consumerFonts.bold,
    color: consumerColors.white,
    flexShrink: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: consumerColors.page,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: consumerColors.ink,
  },
});

export default BoostRequestScreen;
