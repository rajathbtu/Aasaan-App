import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { USE_MOCK_API } from '../config';
import * as realApi from '../api';
import * as mockApi from '../api/mock';
import { useAuth } from '../contexts/AuthContext';

const API = USE_MOCK_API ? mockApi : realApi;

/**
 * Collects the user's full name after successful OTP verification.  Once
 * entered the screen registers the user in the backend and stores the
 * returned token.  The user is then sent to select their role.
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
      const result: any = await API.registerUser(phone, trimmed, language || 'en', 'endUser');
      await login(result.token, result.user);
      navigation.navigate('RoleSelect');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Tell us your name</Text>
      <TextInput
        placeholder="Full name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
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
    marginBottom: 16,
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

export default NameOTPValidationScreen;