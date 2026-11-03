import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { verifyOtp } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalLoader } from '../contexts/GlobalLoaderContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useI18n } from '../i18n';
import { WebView } from 'react-native-webview';
import Header from '../components/Header';
import ActionButton from '../components/ActionButton';
import OtpInput from '../components/OtpInput';
import { spacing, radius } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, language } = (route.params as any) || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { base: C, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [webOpen, setWebOpen] = useState(false);
  const [webUrl, setWebUrl] = useState<string>('');
  const [webTitle, setWebTitle] = useState<string>('');

  const { t, lang } = useI18n(user?.language || language);

  const handleVerify = async () => {
    if (otp.length < 4) {
      Alert.alert(t('common.invalidOtp'), t('common.invalidOtpDesc'));
      return;
    }
    try {
      setLoading(true);
      showLoader(t('loader.verifying'));
      const result: any = await verifyOtp(phone, Number(otp));
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
      hideLoader();
    }
  };

  const openWeb = (type: 'terms' | 'privacy') => {
    const url = type === 'terms' ? 'https://www.aasaanapp.in/terms.html' : 'https://www.aasaanapp.in/privacy.html';
    const title = type === 'terms' ? t('mobile.tos') : t('mobile.privacy');
    setWebUrl(url);
    setWebTitle(title);
    setWebOpen(true);
  };

  const handleChangePhone = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MobileInput', { language: lang });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.white }} >
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

          {/* 4 boxed inputs + auto-read hint + resend */}
          <OtpInput
            phone={String(phone || '')}
            language={lang}
            onOtpChange={setOtp}
            loading={loading}
          />

          {/* Verify button */}
          <ActionButton
            fullWidth
            buttonIcon="checkmark-circle-outline"
            buttonTitle={t('otp.verifyAndContinue')}
            buttonTitleColor={C.onPrimary}
            backgroundColor={C.primary}
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

        {/* In-app WebView Modal — stays light: hosts a light web page. */}
        <Modal
          visible={webOpen}
          animationType="slide"
          onRequestClose={() => setWebOpen(false)}
          presentationStyle="fullScreen"
          statusBarTranslucent={true}
        >
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }}>
                <TouchableOpacity onPress={() => setWebOpen(false)} style={{ padding: 8 }}>
                  <Icon name="close" size={18} color={'#202B27'} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 6, color: '#202B27' }}>{webTitle}</Text>
              </View>
              <WebView
                style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                source={{ uri: webUrl }}
                startInLoadingState={true}
                contentInsetAdjustmentBehavior="never"
                renderLoading={() => (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
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

const makeStyles = (C: BasePalette) => StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.greyLight,
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
    color: C.dark,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  subtle: {
    fontSize: 13,
    color: C.grey,
  },
  phoneRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.dark,
  },
  changeLink: {
    marginLeft: spacing.sm,
    fontSize: 13,
    color: C.primary,
    textDecorationLine: 'underline',
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
    color: C.grey,
  },
  helpLink: {
    color: C.primary,
     fontWeight: '600',
  },
  terms: {
     textAlign: 'center',
     fontSize: 12,
    color: C.grey,
    marginTop: spacing.sm,
  },
  link: { color: C.primary, fontWeight: '600' },
});

export default OTPVerificationScreen;
