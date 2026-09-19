import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { completeOnboarding, sendOtp } from '../api';
import Header from '../components/Header';
import { colors, spacing } from '../theme';

type DeepLinkParams = {
  data?: string;
  token?: string;
};

const getDeepLinkParams = (params: Record<string, unknown> | undefined): DeepLinkParams => {
  const toString = (value: unknown) => {
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string' && value.trim()) return value.trim();
    return undefined;
  };

  return {
    data: toString(params?.data),
    token: toString(params?.token),
  };
};

const SPOnboardSimpleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, token, login, logout, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const attemptedRef = useRef(false);
  const { data, token: routeToken } = getDeepLinkParams(route.params);
  const onboardingToken = data || routeToken;

  useEffect(() => {
    if (authLoading || attemptedRef.current) return;

    attemptedRef.current = true;
    const clearParams = () => {
      navigation.setParams({ data: undefined, token: undefined });
    };

    if (!onboardingToken) {
      setLoading(false);
      Alert.alert(t('common.error'), 'This onboarding link is missing its token.');
      navigation.replace('Auth', { screen: 'MobileInput' });
      return;
    }

    (async () => {
      try {
        if (user && token) await logout();

        const authenticationResult = await completeOnboarding(onboardingToken);
        if ('requiresOtp' in authenticationResult) {
          await sendOtp(authenticationResult.phone);
          clearParams();
          navigation.replace('Auth', {
            screen: 'OTPVerification',
            params: { phone: authenticationResult.phone },
          });
          return;
        }

        if (!authenticationResult?.token) throw new Error(t('common.invalidOtp'));
        await login(authenticationResult.token, authenticationResult.user);
        clearParams();
        navigation.replace('SPSelectServices');
      } catch (error: any) {
        Alert.alert(t('common.error'), error?.message || 'Failed to sign in');
        navigation.replace('Auth', { screen: 'MobileInput' });
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, login, logout, navigation, onboardingToken, t, token, user]);

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