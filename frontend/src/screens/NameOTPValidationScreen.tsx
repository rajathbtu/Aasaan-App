import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';

import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import { spacing, colors, radius } from '../theme';
import { trackScreenView, trackSignUp, trackCustomEvent, trackError } from '../utils/analytics';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Collects the user's full name after successful OTP verification.
 * BUSINESS LOGIC UNCHANGED — UI only styled to match HTML mockup.
 */
const NameOTPValidationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, language } = (route.params as any) || {};
  const { t } = useI18n(language);
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const { login } = useAuth();

  const otpValue = useMemo(() => otp.join(''), [otp]);

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('NameOTPValidationScreen', 'Registration');
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const focusNext = (index: number) => {
    if (index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const focusPrev = (index: number) => {
    if (index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const onChangeDigit = (text: string, index: number) => {
    const sanitized = text.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[index] = sanitized;
    setOtp(next);
    if (sanitized) focusNext(index);
  };

  const onKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index]) {
      focusPrev(index);
    }
  };

  const handleContinue = async () => {
    const name_trimmed = name.trim();
    if (!name_trimmed) {
      // Track name validation failure
      trackCustomEvent('registration_validation_failed', {
        reason: 'empty_name',
        phone: phone
      });
      
      Alert.alert(t('nameReg.nameRequired'), t('nameReg.nameRequiredDesc'));
      return;
    }

    if (otpValue.length < 4) {
      // Track OTP validation failure
      trackCustomEvent('registration_validation_failed', {
        reason: 'incomplete_otp',
        phone: phone,
        otp_length: otpValue.length
      });
      
      Alert.alert(t('common.invalidOtp'), t('common.invalidOtpDesc'));
      return;
    }

    // Track registration attempt
    trackCustomEvent('user_registration_attempted', {
      phone: phone,
      name_length: name_trimmed.length,
      language: language || 'en'
    });

    try {
      setLoading(true);
      const result: any = await API.registerUser(
        phone,
        name_trimmed,
        language || 'en',
        null, // Pass null for role
        otpValue // Pass OTP to the API
      );
      
      // Track successful registration
      trackSignUp('phone_otp', 'endUser'); // Default to endUser, will be updated in role selection
      
      await login(result.token, result.user);
      
      // Track successful user registration
      trackCustomEvent('user_registration_success', {
        user_id: result.user.id,
        phone: phone,
        name: name_trimmed,
        language: language || 'en'
      });
      
      navigation.navigate('RoleSelect');
    } catch (err: any) {
      // Track registration failure
      trackError(err, 'User Registration', undefined, 'high');
      
      Alert.alert(t('common.error'), err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View >
        <Header title={t('nameReg.header')} showBackButton={true} showNotification={false}/>
        <View style={{ height: spacing.sm }} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >


          <View style={styles.separator} />

          {/* Full name */}
          <View style={styles.block}>
            <Text style={styles.label}>
              <Icon name="user" size={12} color={colors.primary} /> {t('nameReg.fullName')}
            </Text>
            <TextInput
              placeholder={t('nameReg.fullNamePlaceholder')}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.greyMuted}
            />
          </View>

          {/* Phone (read-only display) */}
          <View style={styles.block}>
            <Text style={styles.label}>
              <Icon name="phone" size={12} color={colors.primary} /> {t('nameReg.mobileNumber')}
            </Text>
            <View style={styles.phoneRow}>
                {/* Country code (non-editable) */}
                <View style={styles.ccBox}>
                <View style={styles.flag}>
                  <Image source={require('../../assets/indian-flag.png')}
                  style={{ width: 18, height: 12 }} resizeMode="contain"/>
                </View>
                <Text style={styles.ccText}>+91</Text>
                </View>
              <View style={styles.phoneBox}>
                <Text style={styles.phoneText}>{phone}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.changeLink}>{t('common.change')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* OTP visual section (UI only, ignored by logic) */}
          <View style={[styles.block, { marginBottom: 24 }]}>
            <Text style={styles.label}>
              <Icon name="shield" size={12} color={colors.primary} /> {t('nameReg.verificationCode')}
            </Text>
            <Text style={styles.otpHelp}>
              {t('nameReg.sentHint')}
            </Text>

            <View style={styles.otpRow}>
              {[0, 1, 2, 3].map((i) => (
                <TextInput
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={otp[i]}
                  onChangeText={(t) => onChangeDigit(t, i)}
                  onKeyPress={(e) => onKeyPress(e, i)}
                  style={styles.otpBox}
                  returnKeyType="next"
                />
              ))}
            </View>

            <View style={styles.autoRead}>
              <Icon name="mobile" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.autoReadText}>{t('nameReg.autoRead')}</Text>
            </View>

            <View style={styles.resendWrap}>
              <Text style={styles.resendInfo}>
                {t('nameReg.didntReceive')}{' '}
                {seconds > 0 ? <Text style={{ fontWeight: '600' }}>00:{String(seconds).padStart(2, '0')}</Text> : null}
              </Text>
              <TouchableOpacity onPress={() => setSeconds(30)} disabled={seconds > 0 || loading}>
                <Text style={[styles.resendBtn, (seconds > 0 || loading) && { opacity: 0.5 }]}>{t('common.resendOtp')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Verify & Continue (uses existing handle) */}
          <TouchableOpacity
            style={[styles.cta, loading && { opacity: 0.7 }]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="shield" size={14} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.ctaText}>{t('nameReg.verifyAndContinue')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Help text */}
          <View style={styles.help}>
            <Text style={styles.helpText}>
              {t('common.helpLine')} <Text style={styles.link}>help@aasaan.com</Text>
            </Text>
          </View>

          {/* Spacer so security note has room above bottom safe area */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Security info pinned visually near bottom */}
        <View style={styles.securityInfo}>
          <Icon name="shield" size={12} color={colors.grey} style={{ marginRight: 6 }} />
          <Text style={styles.securityText}>{t('nameReg.help')}</Text>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.white },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { marginLeft: 12, fontSize: 18, fontWeight: '700', color: colors.primary },
  separator: { height: 1, backgroundColor: colors.greyLight, marginBottom: 16 },

  formHeader: { alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  formSub: { fontSize: 14, color: colors.grey, textAlign: 'center' },

  block: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.dark, marginBottom: 8 },

  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.greyBorder,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },

  // Phone row
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  ccBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: colors.greyBorder,
    borderRightWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  flag: { width: 18, height: 12, marginRight: 8 },
  flagStripe: { flex: 1 },
  ccText: { color: colors.dark, fontWeight: '600' },
  phoneBox: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.greyBorder,
    borderLeftWidth: 0,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    backgroundColor: colors.light,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneText: { fontSize: 16, fontWeight: '600', color: colors.dark },
  changeLink: { color: colors.primary, fontWeight: '600' },

  // OTP visuals
  otpHelp: { fontSize: 12, color: colors.grey, marginBottom: 10 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  otpBox: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: colors.greyBorder,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 6,
    color: colors.dark,
  },
  autoRead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  autoReadText: { color: colors.primary, fontSize: 12 },

  resendWrap: { alignItems: 'center' },
  resendInfo: { color: colors.grey, fontSize: 12 },
  resendBtn: { color: colors.primary, fontSize: 12, marginTop: 4 },

  // CTA
  cta: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  // Help
  help: { alignItems: 'center', marginTop: 10 },
  helpText: { fontSize: 12, color: colors.grey, textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '600' },

  // Security note near bottom
  securityInfo: {
    position: 'absolute',
    left: 0, right: 0, bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  securityText: { color: colors.grey, fontSize: 12 },
});

export default NameOTPValidationScreen;
