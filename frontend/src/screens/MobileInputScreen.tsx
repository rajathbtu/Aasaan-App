import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { WebView } from 'react-native-webview';

import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Screen to collect the user's mobile number and send an OTP.
 * Business logic unchanged — only UI has been styled to match the mockups.
 */
const MobileInputScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = (route.params as any) || {};
  const { t } = useI18n(language);
  const { setLanguage: setGlobalLanguage } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // In-app webview modal state
  const [webOpen, setWebOpen] = useState(false);
  const [webUrl, setWebUrl] = useState<string>('');
  const [webTitle, setWebTitle] = useState<string>('');

  // Re-render when screen regains focus so useI18n picks up global language
  useFocusEffect(
    React.useCallback(() => {
      // no-op; simply forces rerender on focus change via hook
      return () => {};
    }, [])
  );

  const handleSendOtp = async () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 10) {
      // Input validation UI handled below; do nothing here
      return;
    }
    try {
      setLoading(true);
      await API.sendOtp(trimmed);
      navigation.navigate('OTPVerification', { phone: trimmed, language });
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (phone.length !== 10 || !/^[0-9]+$/.test(phone)) {
      setErrorMessage(t('mobile.invalid'));
    } else {
      setErrorMessage('');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
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

  // purely for UI hint (do NOT change logic)
  const showFormatHint =
    phone.length > 0 && phone.replace(/\D/g, '').length !== 10;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="arrow-left" size={18} color="#4b5563" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('mobile.header')}</Text>
            </View>

            <TouchableOpacity style={styles.langChip} activeOpacity={0.8} onPress={openLanguagePicker}>
              <Icon name="globe" size={12} color="#374151" />
              <Text style={styles.langChipText}>{getLanguageDisplay(language || 'en')}</Text>
              <Icon name="chevron-down" size={10} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Illustration */}
          <View style={styles.illustrationWrap}>
            <View style={styles.illustrationBox}>
              <Icon name="mobile" size={34} color="#2563eb" />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.welcome}>{t('mobile.welcome')}</Text>
            <Text style={styles.instructionSub}>
              {t('mobile.instruction')}
            </Text>
          </View>

          {/* Labeled input with country box */}
          <View style={styles.inputBlock}>
            <Text style={styles.label}>{t('mobile.label')}</Text>

            <View style={styles.inputGroup}>
              {/* Country code (non-editable) */}
              <View style={styles.ccBox}>
                <View style={styles.flag}>
                  <View style={[styles.flagStripe, { backgroundColor: '#f97316' }]} />
                  <View style={[styles.flagStripe, { backgroundColor: '#ffffff' }]} />
                  <View style={[styles.flagStripe, { backgroundColor: '#16a34a' }]} />
                </View>
                <Text style={styles.ccText}>+91</Text>
              </View>

              {/* Phone input */}
              <TextInput
                placeholder={t('mobile.placeholder')}
                keyboardType="phone-pad"
                style={styles.input}
                value={phone}
                maxLength={10}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                placeholderTextColor="#9ca3af"
                onBlur={handleBlur}
                onFocus={handleFocus}
              />
            </View>

            {!isFocused && errorMessage !== '' && (
              <Text style={styles.errorText}>
                <Icon name="exclamation-circle" size={12} color="#ef4444" /> {errorMessage}
              </Text>
            )}
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            {t('mobile.terms')} <Text style={styles.link} onPress={() => openWeb('terms')}>{t('mobile.tos')}</Text> and{' '}
            <Text style={styles.link} onPress={() => openWeb('privacy')}>{t('mobile.privacy')}</Text>
          </Text>

          {/* Send OTP */}
          <TouchableOpacity
            style={[styles.cta, loading && { opacity: 0.7 }]}
            onPress={handleSendOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.ctaText}>{t('mobile.sendOtp')}</Text>
                <Icon name="arrow-right" size={14} color="#ffffff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          {/* Motivation */}
          <View style={styles.motivation}>
            <Icon name="users" size={14} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={styles.motivationText}>
              {t('mobile.joinHint')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* In-app WebView Modal */}
      <Modal visible={webOpen} animationType="slide" onRequestClose={() => setWebOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }}>
              <TouchableOpacity onPress={() => setWebOpen(false)} style={{ padding: 8 }}>
                <Icon name="close" size={18} color="#111827" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 6, color: '#111827' }}>{webTitle}</Text>
            </View>
            <WebView 
              style={{ flex: 1, backgroundColor: '#fff' }}
              source={{ uri: webUrl }}
              startInLoadingState={true}
              contentInsetAdjustmentBehavior="never"
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                  <ActivityIndicator size="large" />
                </View>
              )} 
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  langChip: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  langChipText: {
    marginHorizontal: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },

  // Illustration
  illustrationWrap: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  illustrationBox: {
    width: 96,
    height: 96,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Instructions
  instructions: { alignItems: 'center', marginBottom: 16 },
  welcome: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  instructionSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  // Input block
  inputBlock: { marginTop: 8, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  ccBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  flag: { width: 18, height: 12, marginRight: 8 },
  flagStripe: { flex: 1 },
  ccText: { color: '#374151', fontWeight: '600' },

  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },

  // Terms
  terms: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 16,
  },
  link: { color: '#2563eb', fontWeight: '600' },

  // CTA
  cta: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  // Motivation
  motivation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  motivationText: { color: '#374151', fontSize: 13 },
});

export default MobileInputScreen;
