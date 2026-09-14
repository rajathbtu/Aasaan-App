import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { registerUser, verifyOtp } from '../api';
import Header from '../components/Header';
import { colors, spacing } from '../theme';

type DeepLinkParams = {
  phone?: string;
  otp?: string;
  name?: string;
  language?: string;
};

const getDeepLinkParams = (params: Record<string, unknown> | undefined): DeepLinkParams => {
  const toString = (value: unknown) => {
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string' && value.trim()) return value.trim();
    return undefined;
  };

  return {
    phone: toString(params?.phone),
    otp: toString(params?.otp),
    name: toString(params?.name),
    language: toString(params?.language),
  };
};

const SPOnboardSimpleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, token, login, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const attemptedRef = useRef(false);
  const { phone, otp, name, language } = getDeepLinkParams(route.params);

  useEffect(() => {
    if (authLoading || attemptedRef.current) return;

    attemptedRef.current = true;
    const clearParams = () => {
      navigation.setParams({ phone: undefined, otp: undefined, name: undefined, language: undefined });
    };

    if (user && token) {
      clearParams();
      navigation.replace('SPSelectServices');
      return;
    }

    if (!phone || !otp) {
      setLoading(false);
      Alert.alert(t('common.error'), 'This onboarding link is missing phone or OTP details.');
      navigation.replace('Auth', { screen: 'MobileInput', params: { language } });
      return;
    }

    (async () => {
      try {
        let authenticationResult: any = null;
        try {
          authenticationResult = await verifyOtp(phone, Number(otp));
        } catch {
          authenticationResult = null;
        }

        if (!authenticationResult || authenticationResult.needsRegistration) {
          if (!name) {
            navigation.replace('Auth', {
              screen: 'NameOTPValidation',
              params: { phone, language },
            });
            return;
          }
          authenticationResult = await registerUser(
            phone,
            name,
            language || 'en',
            'serviceProvider',
            otp
          );
        }

        if (!authenticationResult?.token) throw new Error(t('common.invalidOtp'));
        await login(authenticationResult.token, authenticationResult.user);
        clearParams();
        navigation.replace('SPSelectServices');
      } catch (error: any) {
        Alert.alert(t('common.error'), error?.message || 'Failed to sign in');
        navigation.replace('Auth', { screen: 'MobileInput', params: { language } });
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, language, login, name, navigation, otp, phone, t, token, user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.light }}>
      <Header title="Setting up your profile" showBackButton={false} showNotification={false} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {loading && <ActivityIndicator size="large" color={colors.primary} />}
        <Text style={{ color: colors.grey, marginTop: spacing.sm }}>Please wait...</Text>
      </View>
    </View>
  );
};

export default SPOnboardSimpleScreen;