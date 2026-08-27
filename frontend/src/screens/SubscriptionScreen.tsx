import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as realApi from '../api';
import { createSubscriptionPaymentOptions, verifySubscriptionPayment } from '../api/razorpay';
import { RazorpayWebPaymentOptions, RazorpayWebResponse } from '../api/razorpayWeb';
import RazorpayWebView from '../components/RazorpayWebView';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, tints } from '../theme';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import SafeBottomBanner from '../components/SafeBottomBanner';

const API = realApi;

// Pricing config
const PLAN_PRICING: Record<'basic' | 'pro', { priceInr: number; points: number }> = {
  basic: { priceInr: 100, points: 100 },
  pro: { priceInr: 200, points: 200 },
};

// Premium violet palette — matches the Go Professional promos used on the
// profile & work requests screens so the whole upgrade journey feels cohesive.
const VIOLET_DEEP = '#7c3aed';
const VIOLET_INK = '#5b21b6';
const VIOLET_BORDER = '#ddd6fe';

/**
 * Allows service providers to subscribe to a professional plan (basic or
 * pro).  Users can pay with cash or use their credit points.  After
 * subscribing the user profile is refreshed.  End users do not need to
 * subscribe to a plan, but the screen is accessible for completeness.
 */
const SubscriptionScreen: React.FC = () => {
  const { token, user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<RazorpayWebPaymentOptions | null>(null);
  const [currentPlanType, setCurrentPlanType] = useState<'basic' | 'pro'>('basic');

  // Restrict screen to service providers only
  useEffect(() => {
    if (user && user.role !== 'serviceProvider') {
      Alert.alert(t('common.notAllowed'), t('subscription.onlyProviders'));
      if (navigation.canGoBack()) navigation.goBack();
    }
  }, [user?.role]);

  const credits = user?.creditPoints ?? 0;
  const currentPlan = (user?.plan as 'free' | 'basic' | 'pro' | undefined) || 'free';

  const subscribe = async (plan: 'basic' | 'pro', useCredits: boolean) => {
    if (!token) return;
    if (!user || user.role !== 'serviceProvider') {
      Alert.alert(t('common.notAllowed'), t('subscription.onlyProviders'));
      return;
    }
    
    setLoading(true);
    
    try {
      if (useCredits) {
        // Use existing credit-based flow
        await API.subscribePlan(token, plan, useCredits);
        await refreshUser();
        Alert.alert(t('subscription.subscribedTitle'), t('subscription.subscribedDesc', { plan: t(`subscription.plan.${plan}`) }));
        setSelectedPlan(null);
      } else {
        // Use Razorpay payment flow with WebView
        const userDetails = {
          email: '', // Email not available in current User model
          contact: user?.phone || user?.phoneNumber || '',
          name: user?.name || '',
        };

        try {
          const { orderData, paymentOptions: options } = await createSubscriptionPaymentOptions(
            token, 
            plan, 
            userDetails
          );
          
          setPaymentOptions(options);
          setCurrentPlanType(plan);
          setShowPaymentWebView(true);
        } catch (err: any) {
          console.error('Error creating payment options:', err);
          Alert.alert(t('common.error'), err.message || 'Subscription failed');
        }
      }
    } catch (err: any) {
      console.error('Subscription payment error:', err);
      
      // Handle Razorpay specific errors
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
            Alert.alert(t('common.error'), err.description || t('subscription.subscribeFailed'));
        }
      } else {
        Alert.alert(t('common.error'), err.message || t('subscription.subscribeFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpayWebResponse) => {
    if (!token) return;
    
    setShowPaymentWebView(false);
    setLoading(true);
    
    try {
      const verificationData = {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        plan: currentPlanType,
      };

      const verificationResult = await verifySubscriptionPayment(token, verificationData);
      
      if (verificationResult.success) {
        await refreshUser();
        Alert.alert(
          t('subscription.subscribedTitle'), 
          t('subscription.paymentSuccessDesc', { plan: t(`subscription.plan.${currentPlanType}`) }),
          [
            {
              text: 'OK',
              onPress: () => setSelectedPlan(null)
            }
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('subscription.paymentFailedDesc') || 'Payment failed');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      Alert.alert(t('common.error'), err.message || t('subscription.paymentFailedDesc'));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error: any) => {
    setShowPaymentWebView(false);
    console.error('Razorpay payment error:', error);
    
    // Handle Razorpay specific errors
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
          Alert.alert(t('common.error'), error.description || 'Subscription failed');
      }
    } else {
      Alert.alert(t('common.error'), error.description || error.message || 'Subscription failed');
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentWebView(false);
    // User cancelled payment, no need to show error
  };

  const plans = [
    {
      key: 'basic' as const,
      title: t('subscription.plan.basic'),
      price: PLAN_PRICING.basic.priceInr,
      tagline: t('subscription.taglineBasic'),
      features: [
        { label: t('subscription.features.early'), included: true },
        { label: t('subscription.features.standardRadius'), included: true },
        { label: t('subscription.features.multiLoc'), included: false },
        { label: t('subscription.features.priority'), included: false },
      ],
      badge: t('subscription.badge.popular'),
    },
    {
      key: 'pro' as const,
      title: t('subscription.plan.pro'),
      price: PLAN_PRICING.pro.priceInr,
      tagline: t('subscription.taglinePro'),
      features: [
        { label: t('subscription.features.early'), included: true },
        { label: t('subscription.features.increasedRadius'), included: true },
        { label: t('subscription.features.multiLoc'), included: true },
        { label: t('subscription.features.priority'), included: true },
      ],
      badge: t('subscription.badge.bestValue'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      {/* If not a provider, render nothing to avoid flicker */}
      {user && user.role !== 'serviceProvider' ? null : (
        <>
          <Header title={t('subscription.headerTitle')} showBackButton={true} />
          <View style={{ height: spacing.sm }} />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl + 80 }} showsVerticalScrollIndicator={false}>
            {/* Hero — benefit-led opening that sells the upgrade */}
            <View style={styles.hero}>
              <View pointerEvents="none" style={styles.heroGlowLg} />
              <View pointerEvents="none" style={styles.heroGlowSm} />
              <View style={styles.heroTile}>
                <Ionicons name="trophy" size={26} color={colors.white} />
              </View>
              <Text style={styles.heroTitle}>{t('subscription.heroTitle')}</Text>
              <Text style={styles.heroSubtitle}>{t('subscription.heroSubtitle')}</Text>
            </View>

            {/* Current Plan */}
            <View style={styles.currentPlanCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.currentPlanIcon}>
                  <Ionicons name="person" size={17} color={colors.white} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.currentPlanLabel}>{t('subscription.currentPlan')}</Text>
                  <Text style={styles.currentPlanName}>
                    {currentPlan === 'basic' ? t('subscription.plan.basic') : currentPlan === 'pro' ? t('subscription.plan.pro') : t('subscription.plan.free')}
                  </Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{t('subscription.active')}</Text>
                </View>
              </View>
              <View style={styles.creditsRow}>
                <Ionicons name="diamond-outline" size={13} color={VIOLET_DEEP} />
                <Text style={styles.creditsText}>{t('subscription.creditBalance', { points: credits })}</Text>
              </View>
            </View>

            {/* Info banner when already on paid plan */}
            {currentPlan !== 'free' && (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.infoBannerText}>{t('subscription.currentPlanInfo', { plan: t(`subscription.plan.${currentPlan}`) })}</Text>
              </View>
            )}

            {/* Plan cards */}
            {plans.map(plan => {
              const selected = selectedPlan === plan.key;
              const isPro = plan.key === 'pro';
              const hasEnoughCredits = credits >= PLAN_PRICING[plan.key].points;
              return (
                <View key={plan.key}>
                  <View
                    style={[
                      styles.planCard,
                      isPro ? styles.planCardPro : null,
                      selected && (isPro ? styles.planCardSelectedPro : styles.planCardSelectedBasic),
                    ]}
                  >
                    {/* Highlight badge */}
                    <View style={[styles.planBadge, isPro ? styles.planRibbon : styles.planBadgeBasic]}>
                      <Text style={[styles.planBadgeText, isPro && styles.planRibbonText]}>{plan.badge}</Text>
                    </View>

                    <Text style={[styles.planTitle, isPro && { color: VIOLET_INK }]}>{plan.title}</Text>

                    {/* Price */}
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceAmount, { color: isPro ? VIOLET_INK : colors.primary }]}>₹{plan.price}</Text>
                      <Text style={styles.pricePeriod}>{t('subscription.month')}</Text>
                    </View>

                    <Text style={styles.planTagline}>{plan.tagline}</Text>

                    {/* Features — clear ✓ included / ✕ excluded comparison */}
                    <View style={styles.featureList}>
                      {plan.features.map((feat, idx) => (
                        <View key={idx} style={styles.featureRow}>
                          <Ionicons
                            name={feat.included ? 'checkmark-circle' : 'close-circle'}
                            size={18}
                            color={feat.included ? colors.success : colors.greyMuted}
                            style={{ marginRight: spacing.sm }}
                          />
                          <Text style={[styles.featureText, !feat.included && styles.featureTextExcluded]}>
                            {feat.label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {!selected && (
                      <TouchableOpacity
                        style={[styles.selectButton, isPro && styles.selectButtonPro]}
                        onPress={() => setSelectedPlan(plan.key)}
                        disabled={loading}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.selectButtonText}>{t('subscription.selectPlan')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Inline payment options right under the selected card */}
                  {selected && (
                    <View style={styles.payPanel}>
                      <View style={styles.payPanelHeader}>
                        <Ionicons name="wallet-outline" size={16} color={colors.dark} />
                        <Text style={styles.payPanelTitle}>{t('subscription.paymentMethodTitle')}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.payPrimaryBtn}
                        onPress={() => subscribe(plan.key, false)}
                        disabled={loading}
                        activeOpacity={0.85}
                      >
                        {loading ? <ActivityIndicator color={colors.white} /> : (
                          <>
                            <Ionicons name="lock-closed" size={16} color={colors.white} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.payPrimaryText}>
                              {t('subscription.payMoney', { price: PLAN_PRICING[plan.key].priceInr })}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.payCreditsBtn, !hasEnoughCredits && styles.payBtnDisabled]}
                        onPress={() => subscribe(plan.key, true)}
                        disabled={loading || !hasEnoughCredits}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={hasEnoughCredits ? 'diamond' : 'diamond-outline'}
                          size={16}
                          color={hasEnoughCredits ? colors.success : colors.greyMuted}
                          style={{ marginRight: spacing.sm }}
                        />
                        <Text style={[styles.payCreditsText, !hasEnoughCredits && styles.payCreditsTextDisabled]}>
                          {hasEnoughCredits
                            ? t('subscription.useCredits', { points: PLAN_PRICING[plan.key].points })
                            : t('subscription.needMore', { diff: PLAN_PRICING[plan.key].points - credits })}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.creditNoteRow}>
                        <Ionicons name="information-circle" size={12} color={colors.greyMuted} />
                        <Text style={styles.creditNoteText}>{t('subscription.creditBalance', { points: credits })}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Trust footer */}
            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark" size={14} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.trustText}>{t('subscription.securePayments')}</Text>
            </View>
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
        </>
      )}
      <SafeBottomBanner />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
    backgroundColor: colors.white,
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  hero: {
    backgroundColor: colors.violetStrong,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: VIOLET_DEEP,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  heroGlowLg: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.13)',
    top: -80,
    right: -50,
  },
  heroGlowSm: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.09)',
    bottom: -50,
    left: -30,
  },
  heroTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  currentPlanCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.lg,
    padding: spacing.mdPlus,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  currentPlanIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.violetStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanLabel: {
    fontSize: 11,
    color: colors.grey,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentPlanName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  creditsText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.grey,
    marginLeft: 6,
  },
  activeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.lg,
  },
  activeBadgeText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoBannerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.greyLight,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    paddingTop: spacing.lg + 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  // Pro card carries the premium violet identity
  planCardPro: {
    borderWidth: 2,
    borderColor: VIOLET_BORDER,
  },
  planCardSelectedBasic: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.paper,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardSelectedPro: {
    borderColor: VIOLET_DEEP,
    backgroundColor: tints.purpleSoft,
    shadowColor: VIOLET_DEEP,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: 999,
    zIndex: 10,
  },
  planBadgeBasic: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  planRibbon: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.primary,
  },
  planRibbonText: {
    color: colors.white,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  priceAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  pricePeriod: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.grey,
    marginLeft: 4,
  },
  planTagline: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.grey,
    marginBottom: spacing.md,
  },
  featureList: {
    marginBottom: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.dark,
    fontWeight: '500',
    flex: 1,
  },
  featureTextExcluded: {
    color: colors.greyMuted,
    fontWeight: '400',
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  selectButtonPro: {
    backgroundColor: colors.violetStrong,
    shadowColor: VIOLET_DEEP,
  },
  selectButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  payPanel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: VIOLET_BORDER,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: VIOLET_DEEP,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  payPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  payPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
    marginLeft: 6,
  },
  payPrimaryBtn: {
    backgroundColor: colors.violetStrong,
    borderRadius: radius.lg,
    paddingVertical: spacing.mdPlus,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: VIOLET_DEEP,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  payPrimaryText: {
    color: colors.white,
    fontSize: 14.5,
    fontWeight: '700',
  },
  payCreditsBtn: {
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.mdPlus,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  payBtnDisabled: {
    backgroundColor: colors.surface,
  },
  payCreditsText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
  },
  payCreditsTextDisabled: {
    color: colors.greyMuted,
  },
  creditNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  creditNoteText: {
    fontSize: 11.5,
    color: colors.greyMuted,
    marginLeft: 4,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  trustText: {
    fontSize: 12,
    color: colors.grey,
    fontWeight: '500',
  },
});

export default SubscriptionScreen;