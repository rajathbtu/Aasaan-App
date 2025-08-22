import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,  
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { WebView } from 'react-native-webview';
import { Image } from 'react-native';

import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { spacing, colors, radius } from '../theme';

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
      const result = await API.checkUserRegistration(trimmed); // Check if user is registered

      if (result.isRegistered) {
        // Navigate to OTPVerificationScreen if user is registered
        await API.sendOtp(trimmed);
        navigation.navigate('OTPVerification', { phone: trimmed, language });
      } else {
        // Navigate to NameOTPValidationScreen if user is not registered
        navigation.navigate('NameOTPValidation', { phone: trimmed, language });
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to process request');
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
    <View style={{ flex: 1}}>
        {/* Header */}
        <Header 
          title={t('mobile.header')} 
          showBackButton={true} 
          showNotification={false} 
          customRightComponent={
            <TouchableOpacity style={styles.langChip} activeOpacity={0.8} onPress={openLanguagePicker}>
              <Icon name="globe" size={12} color={colors.dark} />
              <Text style={styles.langChipText}>{getLanguageDisplay(language || 'en')}</Text>
              <Icon name="chevron-down" size={10} color={colors.grey} />
            </TouchableOpacity>
          }
        />
        <View style={{ height: spacing.sm }} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >


          {/* Illustration */}
          <View style={styles.illustrationWrap}>
            <View style={styles.illustrationBox}>
              <Icon name="mobile" size={34} color={colors.primary} />
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
                  <Image source={require('../../assets/indian-flag.png')}
                    style={{ width: 18, height: 12 }} resizeMode="contain"/>
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
                placeholderTextColor={colors.greyMuted}
                onBlur={handleBlur}
                onFocus={handleFocus}
              />
            </View>

            {!isFocused && errorMessage !== '' && (
              <Text style={styles.errorText}>
                <Icon name="exclamation-circle" size={12} color={colors.error} /> {errorMessage}
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
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.ctaText}>{t('mobile.sendOtp')}</Text>
                <Icon name="arrow-right" size={14} color={colors.white} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          {/* Motivation */}
          <View style={styles.motivation}>
            <Icon name="users" size={14} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.motivationText}>
              {t('mobile.joinHint')}
            </Text>
          </View>
        </ScrollView>

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
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    marginLeft: spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  langChip: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  langChipText: {
    marginHorizontal: spacing.xs + 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.greyLight,
    marginBottom: spacing.lg,
  },

  // Illustration
  illustrationWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  illustrationBox: {
    width: 96,
    height: 96,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Instructions
  instructions: { alignItems: 'center', marginBottom: spacing.lg },
  welcome: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: spacing.xs },
  instructionSub: { fontSize: 14, color: colors.grey, textAlign: 'center' },

  // Input block
  inputBlock: { marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.greyBorder,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    elevation: 1,
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  ccBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.greyLight,
  },
  flag: { width: 18, height: 12, marginRight: spacing.sm },
  ccText: { color: colors.dark, fontWeight: '600' },

  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.dark,
  },

  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.sm,
  },

  // Terms
  terms: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.grey,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  link: { color: colors.primary, fontWeight: '600' },

  // CTA
  cta: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.mdPlus,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  // Motivation
  motivation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  motivationText: { color: colors.dark, fontSize: 13 },
});

export default MobileInputScreen;
