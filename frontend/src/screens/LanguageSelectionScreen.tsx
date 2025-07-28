import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { languages } from '../data/languages';

/**
 * Screen allowing the user to pick their preferred UI language.  The
 * selected language code is passed along to the mobile input screen and
 * persisted when the user registers.  Internationalisation is not
 * implemented in this demo but storing the value makes it easy to add
 * translations later.
 */
const LanguageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select your language</Text>
      {languages.map(lang => (
        <TouchableOpacity
          key={lang.code}
          style={styles.button}
          onPress={() => navigation.navigate('MobileInput', { language: lang.code })}
        >
          <Text style={styles.buttonText}>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  button: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#1f2937',
  },
});

export default LanguageSelectionScreen;