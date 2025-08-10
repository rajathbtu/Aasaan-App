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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';

import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Collects the user's full name after successful OTP verification.
 * BUSINESS LOGIC UNCHANGED — UI only styled to match HTML mockup.
 */
const NameOTPValidationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, language } = (route.params as any) || {};
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter your full name');
      return;
    }
    try {
      setLoading(true);
      const result: any = await API.registerUser(
        phone,
        trimmed,
        language || 'en',
        'endUser'
      );
      await login(result.token, result.user);
      navigation.navigate('RoleSelect');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="arrow-left" size={18} color="#4b5563" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Complete Registration</Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Form header */}
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Enter Your Details</Text>
            <Text style={styles.formSub}>
              Please provide your name and verify your phone number
            </Text>
          </View>

          {/* Full name */}
          <View style={styles.block}>
            <Text style={styles.label}>
              <Icon name="user" size={12} color="#2563eb" /> Full Name
            </Text>
            <TextInput
              placeholder="Enter your full name"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Phone (read-only display) */}
          <View style={styles.block}>
            <Text style={styles.label}>
              <Icon name="phone" size={12} color="#2563eb" /> Mobile Number
            </Text>
            <View style={styles.phoneRow}>
              <View style={styles.ccBox}>
                <View style={styles.flag}>
                  <View style={[styles.flagStripe, { backgroundColor: '#f97316' }]} />
                  <View style={[styles.flagStripe, { backgroundColor: '#ffffff' }]} />
                  <View style={[styles.flagStripe, { backgroundColor: '#16a34a' }]} />
                </View>
                <Text style={styles.ccText}>+91</Text>
              </View>
              <View style={styles.phoneBox}>
                <Text style={styles.phoneText}>{phone || '9876543210'}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* OTP visual section (UI only, ignored by logic) */}
          <View style={[styles.block, { marginBottom: 24 }]}>
            <Text style={styles.label}>
              <Icon name="shield" size={12} color="#2563eb" /> Verification Code
            </Text>
            <Text style={styles.otpHelp}>
              We've sent a 4-digit code to your mobile number
            </Text>

            <View style={styles.otpRow}>
              {[0, 1, 2, 3].map((i) => (
                <TextInput
                  key={i}
                  maxLength={1}
                  keyboardType="number-pad"
                  style={styles.otpBox}
                  placeholder="•"
                  placeholderTextColor="#d1d5db"
                  // NOTE: no state hookup on purpose — UI only
                />
              ))}
            </View>

            <View style={styles.autoRead}>
              <Icon name="mobile" size={14} color="#2563eb" style={{ marginRight: 6 }} />
              <Text style={styles.autoReadText}>Auto-reading SMS...</Text>
            </View>

            <View style={styles.resendWrap}>
              <Text style={styles.resendInfo}>
                Didn’t receive the code? <Text style={{ fontWeight: '600' }}>00:30</Text>
              </Text>
              <Text style={[styles.resendBtn, { opacity: 0.5 }]}>
                Resend OTP
              </Text>
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
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Icon name="shield" size={14} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.ctaText}>Verify &amp; Continue</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Help text */}
          <View style={styles.help}>
            <Text style={styles.helpText}>
              Having trouble? Contact support at <Text style={styles.link}>help@aasaan.com</Text>
            </Text>
          </View>

          {/* Spacer so security note has room above bottom safe area */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Security info pinned visually near bottom */}
        <View style={styles.securityInfo}>
          <Icon name="shield" size={12} color="#6b7280" style={{ marginRight: 6 }} />
          <Text style={styles.securityText}>Your data is encrypted and secure</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#ffffff' },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { marginLeft: 12, fontSize: 18, fontWeight: '700', color: '#2563eb' },
  separator: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 16 },

  formHeader: { alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  formSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  block: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },

  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
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
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRightWidth: 1,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  flag: { width: 18, height: 12, marginRight: 8 },
  flagStripe: { flex: 1 },
  ccText: { color: '#374151', fontWeight: '600' },
  phoneBox: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  changeLink: { color: '#2563eb', fontWeight: '600' },

  // OTP visuals
  otpHelp: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  otpBox: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 6,
    color: '#111827',
  },
  autoRead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  autoReadText: { color: '#2563eb', fontSize: 12 },

  resendWrap: { alignItems: 'center' },
  resendInfo: { color: '#6b7280', fontSize: 12 },
  resendBtn: { color: '#2563eb', fontSize: 12, marginTop: 4 },

  // CTA
  cta: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  // Help
  help: { alignItems: 'center', marginTop: 10 },
  helpText: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  link: { color: '#2563eb', fontWeight: '600' },

  // Security note near bottom
  securityInfo: {
    position: 'absolute',
    left: 0, right: 0, bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  securityText: { color: '#6b7280', fontSize: 12 },
});

export default NameOTPValidationScreen;
