import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { sendOtp, verifyOtp } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useI18n } from '../i18n';
import { WebView } from 'react-native-webview';
import Header from '../components/Header';
import ActionButton from '../components/ActionButton';
import { spacing, colors, radius } from '../theme';

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, language } = (route.params as any) || {};
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [showAutoRead, setShowAutoRead] = useState(true);
  const [seconds, setSeconds] = useState(30);
  const { login, user, setLanguage } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [webOpen, setWebOpen] = useState(false);
  const [webUrl, setWebUrl] = useState<string>('');
  const [webTitle, setWebTitle] = useState<string>('');

  const { t, lang } = useI18n(user?.language || language);

  const inputsRef = useRef<Array<TextInput | null>>([null, null, null, null]);

  const otpValue = useMemo(() => otp.join(''), [otp]);

  useEffect(() => {
    const tmr = setTimeout(() => setShowAutoRead(false), 2500);
    return () => clearTimeout(tmr);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const focusNext = (index: number) => {
    if (index < inputsRef.current.length - 1) inputsRef.current[index + 1]?.focus();
  };
  const focusPrev = (index: number) => {
    if (index > 0) inputsRef.current[index - 1]?.focus();
  };

  const onChangeDigit = (text: string, index: number) => {
    const sanitized = text.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[index] = sanitized;
    setOtp(next);
    if (sanitized) focusNext(index);
  };
  const onKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index]) focusPrev(index);
  };

  const handleVerify = async () => {
    if (otpValue.length < 4) {
      Alert.alert(t('common.invalidOtp'), t('common.invalidOtpDesc'));
      return;
    }
    try {
      setLoading(true);
      const result: any = await verifyOtp(phone, Number(otpValue));
      if (result.needsRegistration) {
        navigation.navigate('NameOTPValidation', { phone, language: lang });
      } else if (result.token) {
        await login(result.token, result.user);
        const user = result.user;
        if (user.role === 'serviceProvider') {
          const info = user.serviceProviderInfo || {};
          if (!info.services || info.services.length === 0) {
            navigation.navigate('SPSelectServices');
            return;
          }
          if (!info.location) {
            navigation.navigate('LocationSelect');
            return;
          }
        }
        navigation.navigate(user.role === 'serviceProvider' ? 'SPAvailable' : 'Main');
      } else if (result.error) {
        Alert.alert(t('common.error'), result.message || t('common.invalidOtp'));
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      await sendOtp(phone);
      setOtp(['', '', '', '']);
      inputsRef.current[0]?.focus();
      setSeconds(30);
      Alert.alert(t('common.otpSent'), t('common.otpSentDesc'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const openWeb = (type: 'terms' | 'privacy') => {
    const url = type === 'terms' ? 'https://www.aasaanapp.in/terms.html' : 'https://www.aasaanapp.in/privacy.html';
    const title = type === 'terms' ? t('mobile.tos') : t('mobile.privacy');
    setWebUrl(url);
    setWebTitle(title);
    setWebOpen(true);
  };

  const timerText = seconds > 0 ? `00:${String(seconds).padStart(2, '0')}` : '';

  const handleChangePhone = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MobileInput', { language: lang });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }} >
        {/* Header */}
        <Header title={t('otp.header')} showBackButton={true} showNotification={false}/>
        <View style={{ height: spacing.sm }} />

        {/* Separator */}
        <View style={styles.separator} />

        {/* Content */}
        <View style={styles.content}>
          {/* Title + phone + change */}
          <View style={styles.topBlock}>
            <Text style={styles.title}>{t('otp.title')}</Text>
            <Text style={styles.subtle}>{t('otp.sentInfo')}</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneText}>+91 {String(phone || '').replace(/^\+?91/, '')}</Text>
              <TouchableOpacity onPress={handleChangePhone}>
                <Text style={styles.changeLink}>{t('common.change')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4 boxed inputs */}
          <View style={styles.otpRow}>
            {[0, 1, 2, 3].map((i) => (
              <TextInput
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
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

          {/* Auto-read indicator */}
          {showAutoRead && (
            <View style={styles.autoReadRow}>
              <Icon name="mobile" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.autoReadText}>{t('otp.autoRead')}</Text>
            </View>
          )}

          {/* Resend */}
          <View style={styles.resendBlock}>
            <Text style={styles.resendHint}>
              {t('otp.didntReceive')} {timerText ? <Text style={styles.resendTimer}>{timerText}</Text> : null}
            </Text>
            <TouchableOpacity onPress={handleResend} disabled={seconds > 0 || loading}>
              <Text style={[styles.resendLink, (seconds > 0 || loading) && { opacity: 0.5 }]}>
                {t('common.resendOtp')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Verify button */}
          <ActionButton
            fullWidth
            buttonIcon="checkmark-circle-outline"
            buttonTitle={t('otp.verifyAndContinue')}
            buttonTitleColor={colors.white}
            backgroundColor={colors.primary}
            onPress={handleVerify}
            loading={loading}
            style={styles.verifyBtn}
          />

          {/* Help text */}
          <Text style={styles.helpText}>
            {t('common.helpLine')} <Text style={styles.helpLink}>help@aasaan.com</Text>
          </Text>

          {/* Terms and Privacy (open in in-app WebView) */}
          <Text style={styles.terms}>
            {t('mobile.terms')} <Text style={styles.link} onPress={() => openWeb('terms')}>{t('mobile.tos')}</Text> and{' '}
            <Text style={styles.link} onPress={() => openWeb('privacy')}>{t('mobile.privacy')}</Text>
          </Text>
        </View>

        {/* In-app WebView Modal */}
        <Modal
          visible={webOpen}
          animationType="slide"
          onRequestClose={() => setWebOpen(false)}
          presentationStyle="fullScreen"
          statusBarTranslucent={true}
        >
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['top', 'bottom']}>
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
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.greyLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  topBlock: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  subtle: {
    fontSize: 13,
    color: colors.grey,
  },
  phoneRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark,
  },
  changeLink: {
    marginLeft: spacing.sm,
    fontSize: 13,
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  otpRow: {
     flexDirection: 'row',
     justifyContent: 'center',
    marginTop: spacing.xl + spacing.sm,
    marginBottom: spacing.lg,
  },
  otpBox: {
     width: 56,
     height: 56,
    marginHorizontal: spacing.xs + 2,
     textAlign: 'center',
     fontSize: 20,
     fontWeight: '700',
    backgroundColor: colors.white,
     borderWidth: 2,
    borderColor: colors.greyBorder,
    borderRadius: radius.lg,
  },
  autoReadRow: {
     flexDirection: 'row',
     justifyContent: 'center',
     alignItems: 'center',
    marginBottom: spacing.sm,
  },
  autoReadText: {
     fontSize: 13,
    color: colors.primary,
     fontWeight: '500',
  },
  resendBlock: {
     alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resendHint: {
     fontSize: 13,
    color: colors.grey,
  },
  resendTimer: {
     fontWeight: '600',
    color: colors.dark,
  },
  resendLink: {
    marginTop: spacing.xs,
     fontSize: 14,
    color: colors.primary,
     fontWeight: '600',
  },
  verifyBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  helpText: {
     textAlign: 'center',
    marginTop: spacing.md + 2,
     fontSize: 12,
    color: colors.grey,
  },
  helpLink: {
    color: colors.primary,
     fontWeight: '600',
  },
  terms: {
     textAlign: 'center',
     fontSize: 12,
    color: colors.grey,
    marginTop: spacing.sm,
  },
  link: { color: colors.primary, fontWeight: '600' },
});

export default OTPVerificationScreen;
