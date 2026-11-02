import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';

import { registerUser } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import BlockingLoader from '../components/BlockingLoader';
import OtpInput from '../components/OtpInput';
import SvgIcon from '../assets/icons';
import { IndiaFlag } from '../assets/images';
import nameVerificationIllustration from '../../assets/name-verification-illustration.png';

/**
 * Exact tokens from Name_OTP_Verification_Handoff/css/styles.css
 * (green is reserved for actions, active focus, confirmation & security cues).
 */
const NT = {
  green: '#079653',
  greenDark: '#078447',
  greenBright: '#08B878',
  mint: '#E8F8F0',
  mintSoft: '#F2FBF6',
  ink: '#17202B',
  muted: '#657080',
  line: '#D9DEE5',
  field: '#F1F2F5',
  placeholder: '#9AA2AD',
  danger: '#C33B45',
  secureText: '#46525F',
  topbarLine: '#EDF0F2',
  backCircle: '#EFF9F4',
  divider: '#D6DBE1',
};

/**
 * Name & OTP verification — Name_OTP_Verification_Handoff approved design.
 *
 * BUSINESS LOGIC UNCHANGED from the previous screen: the same `registerUser`
 * + `login` + `RoleSelect` flow runs; only the UI was rebuilt to match the
 * approved reference (illustration, icon-tile labels, read-only verified
 * number row, 4-cell OTP, gradient CTA, support line, security strip).
 */
const NameOTPValidationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, language } = (route.params as any) || {};
  const { t, lang } = useI18n(language);
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [apiError, setApiError] = useState('');

  /* Inter is already bundled in the app (spec: use it, don't add a font).
     Non-Latin locales keep the system font for full Indic glyph coverage. */
  const F =
    lang === 'en'
      ? { regular: 'Inter' as const, semi: 'Inter-SemiBold' as const, bold: 'Inter-Bold' as const }
      : { regular: undefined, semi: undefined, bold: undefined };

  /* Heading: newer locales carry `nameReg.title`; English falls back to the
     legacy `nameReg.header` ("Enter Your Details"). The trailing word is
     highlighted in brand green exactly like the approved reference. */
  const titleValue = t('nameReg.title');
  const heading = titleValue === 'nameReg.title' ? t('nameReg.header') : titleValue;
  const headingSpaceIdx = heading.lastIndexOf(' ');
  const headingBase = lang === 'en' && headingSpaceIdx > 0 ? heading.slice(0, headingSpaceIdx + 1) : heading;
  const headingAccent = lang === 'en' && headingSpaceIdx > 0 ? heading.slice(headingSpaceIdx + 1) : '';

  /** CTA stays disabled until the name is plausible and all 4 digits exist. */
  const canContinue = name.trim().length >= 2 && otp.length === 4 && !loading;

  const handleContinue = async () => {
    const nameRegex = /^[\p{L}\s]+$/u; // Allow only letters and spaces
    const name_trimmed = name.trim();

    if (!name_trimmed) {
      Alert.alert(t('nameReg.nameRequired'), t('nameReg.nameRequiredDesc'));
      return;
    }
    if (!nameRegex.test(name_trimmed)) {
      Alert.alert(t('nameReg.invalidName'), t('nameReg.invalidNameDesc'));
      return;
    }

    if (otp.length < 4) {
      Alert.alert(t('common.invalidOtp'), t('common.invalidOtpDesc'));
      return;
    }

    try {
      setLoading(true);
      setApiError('');
      const result: any = await registerUser(
        phone,
        name_trimmed,
        language || 'en',
        null, // Pass null for role
        otp // Pass OTP to the API
      );
      await login(result.token, result.user);
      navigation.navigate('RoleSelect');
    } catch (err: any) {
      // API errors surface inline near the OTP; name/phone inputs are kept.
      setApiError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const openSupport = () => {
    void Linking.openURL('mailto:help@aasaanly.com').catch(() => {});
  };

  return (
    <View style={styles.screen}>
      {/* Decorative mint wave hugging the bottom of the screen (approved reference) */}
      <View pointerEvents="none" style={styles.waveWrap}>
        <SvgXml
          xml={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 40" preserveAspectRatio="none"><path d="M0 40V26C70 10 150 4 225 10c75 6 125 14 165 6v24H0Z" fill="#EAF8F1"/></svg>'}
          width="100%"
          height={40}
        />
      </View>

      <View style={{ paddingTop: insets.top }} />

      {/* Compact header row: mint back circle only, no page title */}
      <View style={styles.topbar}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <SvgIcon name="nv-back" size={23} color={NT.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 56 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {/* Hero: approved illustration + title + supporting sentence */}
        <View style={styles.hero}>
          <Image
            source={nameVerificationIllustration}
            style={styles.heroArt}
            resizeMode="contain"
            accessibilityLabel="Identity verification illustration"
          />
          <Text style={[styles.title, { fontFamily: F.bold }]}>
            {headingBase}
            {headingAccent ? <Text style={styles.titleAccent}>{headingAccent}</Text> : null}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: F.regular }]}>{t('nameReg.subtitle')}</Text>
        </View>

        {/* Full name */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <View style={styles.iconTile}>
              <SvgIcon name="nv-user" size={16} color={NT.green} />
            </View>
            <Text style={[styles.label, { fontFamily: F.bold }]}>{t('nameReg.fullName')}</Text>
          </View>
          <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
            <TextInput
              style={[styles.input, { fontFamily: F.regular }]}
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder={t('nameReg.fullNamePlaceholder')}
              placeholderTextColor={NT.placeholder}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              accessibilityLabel={t('nameReg.fullName')}
            />
          </View>
        </View>

        {/* Read-only verified destination number with Change action */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <View style={styles.iconTile}>
              <SvgIcon name="nv-phone" size={16} color={NT.green} />
            </View>
            <Text style={[styles.label, { fontFamily: F.bold }]}>{t('nameReg.mobileNumber')}</Text>
          </View>
          <View style={styles.phoneRow}>
            <IndiaFlag width={20} height={14} />
            <Text style={[styles.countryCode, { fontFamily: F.bold }]}>+91</Text>
            <View style={styles.phoneDivider} />
            <Text style={[styles.phoneNumber, { fontFamily: F.bold }]} numberOfLines={1}>
              {String(phone || '')}
            </Text>
            <TouchableOpacity
              style={styles.changeBtn}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel={`${t('common.change')} ${t('nameReg.mobileNumber')}`}>
              <SvgIcon name="sa-edit" size={14} color={NT.green} />
              <Text style={[styles.changeText, { fontFamily: F.bold }]}>{t('common.change')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Four-digit verification code */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <View style={styles.iconTile}>
              <SvgIcon name="nv-shield-check" size={16} color={NT.green} />
            </View>
            <Text style={[styles.label, { fontFamily: F.bold }]}>{t('nameReg.verificationCode')}</Text>
          </View>
          <Text style={[styles.hint, { fontFamily: F.regular }]}>{t('nameReg.sentHint')}</Text>

          <OtpInput
            phone={String(phone || '')}
            language={lang}
            onOtpChange={(value) => {
              setOtp(value);
              if (apiError) setApiError('');
            }}
            loading={loading}
          />

          {/* Inline API/verification error, kept next to the OTP per handoff */}
          {apiError ? (
            <Text style={[styles.apiError, { fontFamily: F.regular }]}>{apiError}</Text>
          ) : null}
        </View>

        {/* Verify & Continue */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleContinue}
          disabled={!canContinue}
          style={styles.ctaWrap}
          accessibilityRole="button"
          accessibilityLabel={t('nameReg.verifyAndContinue')}
          accessibilityState={{ disabled: !canContinue, busy: loading }}>
          <LinearGradient
            colors={[NT.green, NT.greenBright]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.cta, !canContinue && styles.ctaDisabled]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <SvgIcon name="nv-shield-check" size={18} color="#FFFFFF" />
                <Text style={[styles.ctaText, { fontFamily: F.bold }]}>{t('nameReg.verifyAndContinue')}</Text>
                <SvgIcon name="ss-arrow-right" size={16} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Support contact line (opens the device email composer) */}
        <View style={styles.support}>
          <SvgIcon name="nv-headset" size={13} color={NT.muted} />
          <Text style={[styles.supportText, { fontFamily: F.regular }]}>
            {t('common.helpLine')}{' '}
            <Text style={[styles.supportLink, { fontFamily: F.bold }]} onPress={openSupport}>
              help@aasaanly.com
            </Text>
          </Text>
        </View>

        {/* Secure-data reassurance strip */}
        <View style={styles.secure}>
          <SvgIcon name="nv-shield-lock" size={16} color={NT.green} />
          <Text style={[styles.secureText, { fontFamily: F.regular }]}>{t('nameReg.help')}</Text>
        </View>
      </ScrollView>

      <BlockingLoader visible={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  /* Decorative mint wave hugging the bottom of the screen */
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    zIndex: 0,
  },

  /* .topbar{height:66px;padding:8px 20px;border-bottom:1px solid #edf0f2} — tightened */
  topbar: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: NT.topbarLine,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  /* .back{width:46px;height:46px;border-radius:50%;background:#eff9f4} */
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: NT.backCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* .content{padding:8px 20px 24px} */
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 4,
    backgroundColor: 'transparent',
    zIndex: 1,
  },

  /* .hero{text-align:center;padding:0 0 18px} .hero-art{width:220px;height:128px;object-fit:contain} */
  hero: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  heroArt: {
    width: 176,
    height: 102,
    marginBottom: 4,
  },
  /* .hero h2{font-size:27px;line-height:1.12;font-weight:800;letter-spacing:-.8px}
     Scaled to the app's device convention (27 → 24) to match the approved
     MobileInput heading — raw 430px-canvas values read oversized at 360–393dp. */
  title: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.7,
    fontWeight: '800',
    color: NT.ink,
    textAlign: 'center',
  },
  /* .hero h2 span{color:var(--green)} */
  titleAccent: {
    color: NT.green,
  },
  /* .hero p{font-size:15px;line-height:1.45;color:var(--muted);max-width:330px} */
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: NT.muted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },

  /* .field-group{margin:16px 0 0} */
  fieldGroup: {
    marginTop: 12,
  },
  /* .label{gap:10px;font-size:17px;font-weight:750;margin-bottom:9px} — tightened */
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 7,
  },
  /* .icon-wrap{width:30px;height:30px;border-radius:10px;background:var(--mint)} — tightened */
  iconTile: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: NT.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14.5,
    fontWeight: '700',
    color: NT.ink,
  },

  /* .input{height:54px;border:1.5px solid var(--line);border-radius:14px;background:#fff;padding:0 16px;font-size:16px} */
  inputWrap: {
    height: 46,
    borderWidth: 1.5,
    borderColor: NT.line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  /* .input:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(7,150,83,.10)} */
  inputWrapFocused: {
    borderColor: NT.green,
    shadowColor: NT.green,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    fontSize: 14,
    color: NT.ink,
    paddingVertical: 0,
  },

  /* .phone-value{height:54px;border-radius:14px;background:var(--field);padding:0 14px;gap:10px;font-size:16px;font-weight:700} */
  phoneRow: {
    height: 46,
    borderRadius: 12,
    backgroundColor: NT.field,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: NT.ink,
  },
  /* .divider{height:28px;width:1px;background:#d6dbe1;margin:0 3px} — tightened */
  phoneDivider: {
    width: 1,
    height: 22,
    backgroundColor: NT.divider,
    marginHorizontal: 3,
  },
  /* .phone-number{flex:1;letter-spacing:.3px} */
  phoneNumber: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: NT.ink,
  },
  /* .change{color:var(--green);font-size:15px;font-weight:750;padding:8px 0} */
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
    color: NT.green,
  },

  /* .hint{font-size:14px;line-height:1.4;color:var(--muted);margin:4px 0 18px} */
  hint: {
    fontSize: 12,
    lineHeight: 16,
    color: NT.muted,
    marginTop: 2,
    marginBottom: 6,
  },
  apiError: {
    fontSize: 12,
    color: NT.danger,
    marginTop: 2,
    marginHorizontal: 2,
  },

  /* .primary{height:58px;border-radius:16px;background:linear-gradient(100deg,#079653,#08b878);font-size:17px;font-weight:800;gap:12px;box-shadow:0 5px 12px rgba(7,150,83,.18);margin-top:26px} */
  ctaWrap: {
    marginTop: 18,
  },
  cta: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: NT.green,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  /* .primary:disabled{opacity:.5;box-shadow:none} */
  ctaDisabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* .support{text-align:center;font-size:13px;color:var(--muted);margin:16px 0 0} */
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  supportText: {
    fontSize: 12,
    lineHeight: 17,
    color: NT.muted,
    flexShrink: 1,
  },
  supportLink: {
    color: NT.green,
    fontWeight: '700',
  },

  /* .secure{margin:22px 0 0;background:var(--mint-soft);border-radius:999px;min-height:48px;gap:10px;padding:8px 12px;color:#46525f;font-size:13px} */
  secure: {
    marginTop: 16,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: NT.mintSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secureText: {
    fontSize: 12,
    color: NT.secureText,
  },
});

export default NameOTPValidationScreen;
