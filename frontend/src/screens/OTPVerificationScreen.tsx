import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Screen where the user enters the four digit OTP sent to their phone.
 * Verifies the code and either logs the user in or prompts them to
 * complete registration.  In a real application the OTP input would
 * automatically focus and might read SMS messages for auto‑fill.
 */
const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, language } = (route.params as any) || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleVerify = async () => {
    if (otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4‑digit code');
      return;
    }
    try {
      setLoading(true);
      const result: any = await API.verifyOtp(phone, Number(otp));
      if (result.needsRegistration) {
        // Phone verified but user does not exist yet
        navigation.navigate('NameOTPValidation', { phone, language });
      } else if (result.token) {
        // Existing user; log them in and route accordingly
        await login(result.token, result.user);
        const user = result.user;
        if (user.role === 'serviceProvider') {
          // If provider has not completed onboarding steps route them
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
        Alert.alert('Error', result.message || 'Invalid OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      await API.sendOtp(phone);
      Alert.alert('OTP sent', 'A new OTP has been sent to your phone');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the OTP</Text>
      <Text style={styles.subtitle}>We sent a 4‑digit code to {phone}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        maxLength={4}
        value={otp}
        onChangeText={setOtp}
      />
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResend} disabled={loading}>
        <Text style={styles.resendText}>Resend code</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  input: {
    width: '60%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    color: '#2563eb',
    fontSize: 14,
    marginTop: 8,
  },
});

export default OTPVerificationScreen;