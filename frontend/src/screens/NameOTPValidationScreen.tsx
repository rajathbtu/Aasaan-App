import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { registerUser } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import BlockingLoader from '../components/BlockingLoader';
import ActionButton from '../components/ActionButton';
import FormField from '../components/FormField';
import CountryCodePrefix from '../components/CountryCodePrefix';
import OtpInput from '../components/OtpInput';
import { spacing, colors, radius } from '../theme';

/**
 * Collects the user's full name after successful OTP verification.
 * BUSINESS LOGIC UNCHANGED â€” UI only styled to match HTML mockup.
 */
const NameOTPValidationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, language } = (route.params as any) || {};
  const { t, lang } = useI18n(language);
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
          <FormField
            icon="person"
            label={t('nameReg.fullName')}
            value={name}
            onChangeText={setName}
            placeholder={t('nameReg.fullNamePlaceholder')}
            containerStyle={styles.block}/>

          {/* Phone (read-only display) */}
          <FormField
            icon="call"
            label={t('nameReg.mobileNumber')}
            value={String(phone || '')}
            editable={false}
            containerStyle={styles.block}
            prefix={<CountryCodePrefix />}
            trailing={
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.changeLink}>{t('common.change')}</Text>
              </TouchableOpacity>
            }/>

          {/* OTP: styled to match the rest of the form fields */}
          <View style={styles.otpSection}>
            <View style={styles.otpHeader}>
              <Ionicons name="lock-closed" size={16} color={colors.greyMuted} style={styles.otpHeaderIcon} />
              <Text style={styles.otpLabel}>{t('nameReg.verificationCode')}</Text>
            </View>
            <Text style={styles.otpHelp}>{t('nameReg.sentHint')}</Text>

            <OtpInput
              phone={String(phone || '')}
              language={lang}
              onOtpChange={setOtp}
              loading={loading}
            />
          </View>

          {/* Verify & Continue (uses existing handle) */}
          <ActionButton
            fullWidth
            buttonIcon="shield-checkmark-outline"
            buttonTitle={t('nameReg.verifyAndContinue')}
            buttonTitleColor={colors.white}
            backgroundColor={colors.primary}
            onPress={handleContinue}
            loading={loading}
            style={styles.cta}
          />

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
          <Ionicons name="shield-checkmark-outline" size={12} color={colors.greyMuted} style={{ marginRight: 6 }} />
          <Text style={styles.securityText}>{t('nameReg.help')}</Text>
        </View>
        <BlockingLoader visible={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.white },

  separator: { height: 1, backgroundColor: colors.greyLight, marginBottom: 16 },

  block: { marginBottom: 16 },

  changeLink: { color: colors.primary, fontWeight: '600' },

  // OTP visuals
  otpSection: {
    marginBottom: 24,
    paddingTop: 2,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  otpHeaderIcon: {
    marginRight: 8,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  otpHelp: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: 12,
  },

  // CTA
  cta: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    marginTop: 4,
  },

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
