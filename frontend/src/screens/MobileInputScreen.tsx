import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Screen to collect the user's mobile number and send an OTP.  The
 * component validates the input and invokes the appropriate API call.
 */
const MobileInputScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = (route.params as any) || {};
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 6) {
      Alert.alert('Invalid number', 'Please enter a valid mobile number');
      return;
    }
    try {
      setLoading(true);
      await API.sendOtp(trimmed);
      // Navigate to OTP verification screen, preserving phone and language
      navigation.navigate('OTPVerification', { phone: trimmed, language });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Enter your mobile number</Text>
      <TextInput
        placeholder="10‑digit mobile number"
        keyboardType="phone-pad"
        style={styles.input}
        value={phone}
        maxLength={15}
        onChangeText={setPhone}
      />
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]} 
        onPress={handleSendOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
    marginBottom: 24,
    color: '#111827',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MobileInputScreen;