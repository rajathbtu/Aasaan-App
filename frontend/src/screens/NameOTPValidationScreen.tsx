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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { registerUser } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import Header from '../components/Header';
import BlockingLoader from '../components/BlockingLoader';
import ActionButton from '../components/ActionButton';
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

          {/* OTP: 4 boxed inputs + auto-read hint + resend */}
          <View style={[styles.block, { marginBottom: 24 }]}>
            <Text style={styles.label}>
              <Icon name="shield" size={12} color={colors.primary} /> {t('nameReg.verificationCode')}
            </Text>
            <Text style={styles.otpHelp}>
              {t('nameReg.sentHint')}
            </Text>

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
          <Icon name="shield" size={12} color={colors.grey} style={{ marginRight: 6 }} />
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
