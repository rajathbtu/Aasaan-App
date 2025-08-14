import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';

/**
 * Allows the newly registered user to choose whether they want to use
 * Aasaan as an end user (someone requesting services) or as a service
 * provider.  The selected role is persisted to the backend and the
 * onboarding flow branches accordingly.
 */
const RoleSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { updateUser } = useAuth();
  const { t } = useI18n();

  const handleSelectRole = async (role: 'endUser' | 'serviceProvider') => {
    try {
      await updateUser({ role });
      if (role === 'serviceProvider') {
        navigation.navigate('SPSelectServices');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('roleSelect.updateRoleError'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('roleSelect.title')}</Text>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: '#ecfdf5' }]}
        onPress={() => handleSelectRole('endUser')}
      >
        <Text style={styles.cardTitle}>{t('roleSelect.endUserTitle')}</Text>
        <Text style={styles.cardDesc}>{t('roleSelect.endUserDesc')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: '#eef2ff' }]}
        onPress={() => handleSelectRole('serviceProvider')}
      >
        <Text style={styles.cardTitle}>{t('roleSelect.spTitle')}</Text>
        <Text style={styles.cardDesc}>{t('roleSelect.spDesc')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
  },
  cardDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default RoleSelectScreen;