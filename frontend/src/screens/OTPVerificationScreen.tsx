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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { languages } from '../data/languages';
import { useI18n } from '../i18n';

const API = USE_MOCK_API ? mockApi : realApi;

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
      const result: any = await API.verifyOtp(phone, Number(otpValue));
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
            navigation.navigate('SPSelectLocation');
            return;
          }
        }
        navigation.navigate('Main');
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
      await API.sendOtp(phone);
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

  const timerText = seconds > 0 ? `00:${String(seconds).padStart(2, '0')}` : '';

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size={18} color="#4b5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('otp.header')}</Text>
        </View>
        {/* Language picker */}
        <View>
          <TouchableOpacity onPress={() => setPickerOpen(o => !o)}>
            <Icon name="globe" size={18} color="#4b5563" />
          </TouchableOpacity>
          {pickerOpen && (
            <View style={styles.menu}>
              {languages.map(l => (
                <TouchableOpacity key={l.code} style={styles.menuItem} onPress={async () => { await setLanguage(l.code); }}>
                  <Text style={styles.menuItemText}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

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
            <TouchableOpacity onPress={() => navigation.goBack()}>
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
            <Icon name="mobile" size={14} color="#2563eb" style={{ marginRight: 6 }} />
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
        <TouchableOpacity style={[styles.verifyBtn, loading && { opacity: 0.85 }]} onPress={handleVerify} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.verifyInner}>
              <Icon name="check-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.verifyText}>{t('otp.verifyAndContinue')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Help text */}
        <Text style={styles.helpText}>
          {t('common.helpLine')} <Text style={styles.helpLink}>help@aasaan.com</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f9fafb', // gray-50
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  topBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtle: {
    fontSize: 13,
    color: '#6b7280',
  },
  phoneRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  changeLink: {
    marginLeft: 8,
    fontSize: 13,
    color: '#2563eb',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  otpBox: {
    width: 56,
    height: 56,
    marginHorizontal: 6,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
  },
  autoReadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoReadText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  resendBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendHint: {
    fontSize: 13,
    color: '#6b7280',
  },
  resendTimer: {
    fontWeight: '600',
    color: '#111827',
  },
  resendLink: {
    marginTop: 4,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  verifyBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 12,
    color: '#6b7280',
  },
  helpLink: {
    color: '#2563eb',
    fontWeight: '600',
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    zIndex: 100,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
  },
});

export default OTPVerificationScreen;
