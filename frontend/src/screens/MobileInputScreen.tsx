import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  Linking,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import Icon from 'react-native-vector-icons/FontAwesome';
import { WebView } from 'react-native-webview';

import { checkUserRegistration, getTruecallerLoginStatus, sendOtp, startTruecallerLogin } from '../api';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';
import { useAuth } from '../contexts/AuthContext';
import BlockingLoader from '../components/BlockingLoader';
import SvgIcon from '../assets/icons';
import { IndiaFlag } from '../assets/images';
import mobileOtpIllustration from '../../assets/mobile-otp-illustration.png';
import { colors } from '../theme';
import { BrandText } from '../components/BrandWord';
import { TRUECALLER_APP_KEY } from '../config';

/* Exact tokens from Mobile_Entry_Handoff/styles.css */
const ME = {
  brand: '#00A86B',
  brandDark: '#008E55',
  mint: '#E7F8EF',
  mintSoft: '#F0FAF5',
  ink: '#17231F',
  muted: '#64748B',
  line: '#DFE5E8',
  canvas: '#FBFDFC',
  fieldBorder: '#D9E0E3',
  placeholder: '#9AA4B2',
  danger: '#D04444',
  termsText: '#6B7280',
  topbarLine: '#EEF1EF',
  socialBorder: '#CFE8DA',
  socialIconBg: '#DCF6E8',
  socialWave: '#D0F5E4',
  pageWave: '#EAF7F0',
};

/**
 * Mobile number entry — Mobile_Entry_Handoff approved design.
 * Business logic unchanged: checkUserRegistration → sendOtp → OTP/Name flow.
 */
const MobileInputScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = (route.params as any) || {};
  const { t } = useI18n(language);
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // In-app webview modal state
  const [webOpen, setWebOpen] = useState(false);
  const [webUrl, setWebUrl] = useState<string>('');
  const [webTitle, setWebTitle] = useState<string>('');
  const [truecallerRequestId, setTruecallerRequestId] = useState<string | null>(null);
  const [truecallerStarted, setTruecallerStarted] = useState(false);
  const [truecallerInitializing, setTruecallerInitializing] = useState(false);

  const truecallerHtml = (requestId: string) => `
    <!doctype html>
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body>
      <script>
        window.location.href = ${JSON.stringify(`truecallersdk://truesdk/web_verify?type=btmsheet&requestNonce=${requestId}&partnerKey=${TRUECALLER_APP_KEY}&partnerName=Aasaan&lang=en&privacyUrl=https%3A%2F%2Fwww.aasaanapp.in%2Fprivacy.html&termsUrl=https%3A%2F%2Fwww.aasaanapp.in%2Fterms.html&loginPrefix=continue&loginSuffix=login&ctaPrefix=continuewith&ctaColor=%232563eb&ctaTextColor=%23ffffff&btnShape=round&skipOption=useanothermethod&ttl=30000`)};
      </script>
    </body></html>`;

  const validate = (value: string): string => {
    if (value.length !== 10) return t('mobile.invalid');
    if (!/^[6-9]/.test(value)) return t('mobile.invalidIndian');
    return '';
  };

  const handleSendOtp = async () => {
    if (loading) return;
    const trimmed = phone.trim();
    const validationError = validate(trimmed);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage('');
    try {
      setLoading(true);
      const result = await checkUserRegistration(trimmed); // Check if user is registered
      await sendOtp(trimmed); // OTP must be issued for BOTH login & sign up flows

      if (result.isRegistered) {
        navigation.navigate('OTPVerification', { phone: trimmed, language });
      } else {
        navigation.navigate('NameOTPValidation', { phone: trimmed, language });
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, 10));
    if (errorMessage) setErrorMessage('');
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (phone.length > 0) {
      setErrorMessage(validate(phone));
    }
  };

  const openLanguagePicker = () => {
    navigation.navigate('LanguageSelection', {
      preferred: language,
    });
  };

  const openWeb = (type: 'terms' | 'privacy') => {
    const url =
      type === 'terms'
        ? 'https://www.aasaanapp.in/terms.html'
        : 'https://www.aasaanapp.in/privacy.html';
    const title = type === 'terms' ? t('mobile.tos') : t('mobile.privacy');
    setWebUrl(url);
    setWebTitle(title);
    setWebOpen(true);
  };

  const initiateTruecallerLogin = async () => {
    setTruecallerStarted(false);
    setTruecallerInitializing(true);
    try {
      const result = await startTruecallerLogin();
      setTruecallerRequestId(result.requestId);
    } catch {
      setTruecallerInitializing(false);
      // OTP remains available if the background Truecaller attempt cannot start.
    }
  };

  React.useEffect(() => {
    if (Platform.OS === 'android') void initiateTruecallerLogin();
  }, []);

  React.useEffect(() => {
    if (!truecallerRequestId || !truecallerStarted) return;
    let cancelled = false;

    const poll = async () => {
      const delays = [300, 700, 1200, 2000, 3000];

      for (const delay of delays) {
        if (cancelled) return;
        await new Promise(resolve => setTimeout(resolve, delay));
        if (cancelled) return;
        try {
          const result = await getTruecallerLoginStatus(truecallerRequestId);
          if (result.status === 'complete') {
            await login(result.token, result.user);
            return;
          }
          if (result.status === 'failed') {
            return;
          }
        } catch (error: any) {
          if (error?.response?.status === 404) continue;
          return;
        }
      }
    };

    void poll();
    return () => { cancelled = true; };
  }, [truecallerRequestId, truecallerStarted, login]);

  return (
    <View style={styles.screen}>
      {/* Decorative bottom wave from the approved reference */}
      <View pointerEvents="none" style={styles.waveWrap}>
        <SvgXml
          xml={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 80" preserveAspectRatio="none"><path d="M0 46C52 22 112 16 196 38S332 66 390 34V80H0Z" fill="#EAF7F0"/></svg>'}
          width="100%"
          height={64}
        />
      </View>

      <View style={{ paddingTop: insets.top }} />
      {/* Top bar: back + language selector (no brand logo) */}
      <View style={styles.topbar}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <SvgIcon name="sa-back" size={22} color={ME.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.language}
          activeOpacity={0.8}
          onPress={openLanguagePicker}
          accessibilityRole="button"
          accessibilityLabel={t('mobile.header')}>
          <SvgIcon name="mf-globe" size={18} color={ME.ink} />
          <Text style={styles.languageText}>{getLanguageDisplay(language || 'en')}</Text>
          <SvgIcon name="chevron-down" size={12} color={ME.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 28 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration — exact approved artwork */}
        <View style={styles.illustrationWrap}>
          <Image
            source={mobileOtpIllustration}
            style={styles.illustration}
            resizeMode="contain"
            accessibilityLabel="Phone illustration representing secure mobile sign-in"
          />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <BrandText style={styles.heading}>{t('mobile.welcome')}</BrandText>
          <Text style={styles.subtitle}>{t('mobile.instruction')}</Text>
        </View>

        {/* Field label */}
        <View style={styles.fieldLabel}>
          <View style={styles.fieldIconBox}>
            <SvgIcon name="mf-phone" size={21} color={ME.brandDark} />
          </View>
          <Text style={styles.fieldLabelText}>{t('mobile.label')}</Text>
        </View>

        {/* Phone input */}
        <View style={[styles.phoneField, isFocused && styles.phoneFieldFocused]}>
          <View style={styles.country}>
            <IndiaFlag width={28} height={19} />
            <Text style={styles.countryCode}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={handleChangePhone}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={t('mobile.placeholder')}
            placeholderTextColor={ME.placeholder}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
            accessibilityLabel={t('mobile.label')}
          />
        </View>
        <Text style={styles.helper}>{errorMessage}</Text>

        {/* Send OTP */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleSendOtp}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('mobile.sendOtp')}>
          <LinearGradient
            colors={['#00A96B', '#009B5E']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.send, loading && styles.sendDisabled]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.sendText}>{t('mobile.sendOtp')}</Text>
                <SvgIcon name="ss-arrow-right" size={21} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          {t('mobile.terms')}{' '}
          <Text style={styles.link} onPress={() => openWeb('terms')}>{t('mobile.tos')}</Text>
          {' '}and{' '}
          <Text style={styles.link} onPress={() => openWeb('privacy')}>{t('mobile.privacy')}</Text>
        </Text>

        {/* Social proof */}
        <LinearGradient
          colors={['#EFFAF4', '#E8F8F0']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.socialProof}>
          <View pointerEvents="none" style={styles.socialWave} />
          <View style={styles.socialIcon}>
            <SvgIcon name="mf-users" size={26} color={ME.brandDark} />
          </View>
          <View style={styles.socialCopy}>
            <Text style={styles.socialTitle}>{t('mobile.joinTitle')}</Text>
            <BrandText style={styles.socialSubtitle}>{t('mobile.joinSubtitle')}</BrandText>
          </View>
        </LinearGradient>
      </ScrollView>

      {Platform.OS === 'android' && truecallerRequestId && (
        <WebView
          source={{ html: truecallerHtml(truecallerRequestId) }}
          style={styles.hiddenTruecallerWebView}
          javaScriptEnabled
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith('truecallersdk://')) {
              setTruecallerInitializing(false);
              setTruecallerStarted(true);
              void Linking.openURL(request.url)
                .catch(() => {
                  setTruecallerStarted(false);
                });
              return false;
            }
            return true;
          }}
        />
      )}

      <BlockingLoader visible={loading || truecallerInitializing} />
      {/* In-app WebView Modal */}
      <Modal visible={webOpen} animationType="slide" onRequestClose={() => setWebOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.greyLight }}>
              <TouchableOpacity onPress={() => setWebOpen(false)} style={{ padding: 8 }}>
                <Icon name="close" size={18} color={colors.dark} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 6, color: colors.dark }}>{webTitle}</Text>
            </View>
            <WebView
              style={{ flex: 1, backgroundColor: colors.white }}
              source={{ uri: webUrl }}
              startInLoadingState={true}
              contentInsetAdjustmentBehavior="never"
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
                  <ActivityIndicator size="large" />
                </View>
              )}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  /* Decorative mint wave hugging the bottom of the screen (approved reference) */
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    zIndex: 0,
  },

  /* .topbar{height:76px;padding:8px 16px 14px;border-bottom:1px solid #eef1ef} */
  topbar: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: ME.topbarLine,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  /* .back{width:54px;height:54px;border-radius:50%;background:#f0faf5} */
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ME.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* .language{height:48px;padding:0 11px;border-radius:18px;background:#f0f8f3;gap:9px} */
  language: {
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#F0F8F3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  languageText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: ME.ink,
  },
  /* main{padding:0 18px} */
  scrollContent: {
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  /* .illustration-wrap{height:220px;padding-top:8px} */
  illustrationWrap: {
    height: 196,
    paddingTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    maxWidth: 360,
    height: '100%',
  },
  /* .intro{text-align:center;margin:0 auto 26px} */
  intro: {
    alignItems: 'center',
    marginBottom: 22,
  },
  /* h1{font-size:28px;line-height:1.12;letter-spacing:-1.2px;font-weight:800} */
  heading: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.8,
    fontWeight: '800',
    color: ME.ink,
    textAlign: 'center',
  },
  /* .subtitle{font-size:15px;line-height:1.4;color:#64748b;margin-top:12px} */
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    color: ME.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  /* .field-label{gap:11px;font-size:18px;font-weight:750;margin-bottom:13px} */
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 11,
  },
  fieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: ME.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: ME.ink,
  },
  /* .phone-field{height:66px;border:1.5px solid #d9e0e3;border-radius:18px;padding:0 12px} */
  phoneField: {
    height: 56,
    borderWidth: 1.5,
    borderColor: ME.fieldBorder,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  phoneFieldFocused: {
    borderColor: ME.brand,
    shadowColor: ME.brand,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  /* .country{gap:7px;padding-right:10px;border-right:1px solid #dfe5e8;font-size:17px;font-weight:700} */
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 9,
    borderRightWidth: 1,
    borderRightColor: ME.line,
  },
  countryCode: {
    fontSize: 15.5,
    fontWeight: '700',
    color: ME.ink,
  },
  /* input{flex:1;padding-left:12px;font-size:16px;letter-spacing:.2px} */
  input: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 10,
    paddingVertical: 0,
    fontSize: 15,
    letterSpacing: 0.2,
    color: ME.ink,
    backgroundColor: 'transparent',
  },
  /* .helper{font-size:13px;color:#d04444;margin:8px 4px 0;min-height:17px} */
  helper: {
    fontSize: 12,
    color: ME.danger,
    marginTop: 6,
    marginHorizontal: 4,
    minHeight: 16,
  },
  /* .send{height:66px;border-radius:18px;gap:20px;font-size:20px;font-weight:800;margin-top:16px} */
  send: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 14,
    shadowColor: '#009156',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  sendDisabled: {
    opacity: 0.7,
  },
  sendText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  /* .terms{font-size:14px;line-height:1.55;color:#6b7280;margin:18px 8px 0;text-align:center} */
  terms: {
    marginTop: 14,
    marginHorizontal: 8,
    fontSize: 12.5,
    lineHeight: 18,
    color: ME.termsText,
    textAlign: 'center',
  },
  link: {
    color: ME.brandDark,
    fontWeight: '700',
  },
  /* .social-proof{margin-top:28px;min-height:94px;padding:13px;border-radius:22px;gap:12px} */
  socialProof: {
    marginTop: 22,
    minHeight: 84,
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  /* .social-proof:after{width:150px;height:70px;right:-45px;bottom:-45px;border-radius:50%;background:#d0f5e4} */
  socialWave: {
    position: 'absolute',
    width: 150,
    height: 70,
    right: -45,
    bottom: -45,
    borderRadius: 35,
    backgroundColor: ME.socialWave,
  },
  /* .social-icon{width:58px;height:58px;border-radius:50%;background:#dcf6e8} */
  socialIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: ME.socialIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /* .social-copy{border-left:1px solid #cfe8da;padding-left:16px} */
  socialCopy: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: ME.socialBorder,
    paddingLeft: 14,
  },
  socialTitle: {
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '700',
    color: ME.ink,
  },
  socialSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: ME.muted,
    marginTop: 3,
  },
  hiddenTruecallerWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default MobileInputScreen;
