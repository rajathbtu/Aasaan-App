import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { languages, getLanguageDisplay } from '../data/languages';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useAuth } from '../contexts/AuthContext';
import { translations, SupportedLocale } from '../i18n/translations';

const STICKY_HEIGHT = 72; // approx height of the bottom CTA area (padding + button)

const LanguageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { setLanguage, user } = useAuth();
  const preferred = (route.params && route.params.preferred) || undefined;
  const allowLeave = useRef(false);

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    preferred || user?.language || null
  );

  // Block back navigation only during onboarding (no user). Allow when opened in-app (user exists)
  useEffect(() => {
    if (user) return; // in-app flow; do not block
    const onBackPress = () => (allowLeave.current ? false : true);
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    const navSub = navigation.addListener('beforeRemove', (e: any) => {
      if (allowLeave.current) return; // allow leave after Continue
      e.preventDefault();
    });
    return () => {
      backSub.remove();
      navSub();
    };
  }, [navigation, user]);

  const t = useMemo(() => {
    const lang = (selectedLanguage || 'en') as SupportedLocale;
    return translations[lang];
  }, [selectedLanguage]);

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
  };

  const handleContinue = async () => {
    if (!selectedLanguage) return;
    // persist globally
    await setLanguage(selectedLanguage);

    // allow this screen to be popped/navigated away
    allowLeave.current = true;

    // If user is authenticated, just go back to previous screen
    if (user) {
      navigation.goBack();
      return;
    }

    // Default onboarding flow
    navigation.navigate('MobileInput', { language: selectedLanguage });
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        // extra top pad on Android for translucent status bar safety
        Platform.OS === 'android' && { paddingTop: (StatusBar.currentHeight || 0) },
        { paddingBottom: insets.bottom }, // ensure safe bottom base
      ]}
      edges={['top', 'bottom']} // explicitly apply top & bottom insets
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Aasaan</Text>
        </View>

        {/* Language Selection Content */}
        <ScrollView
          contentContainerStyle={[
            styles.languageSelection,
            // add bottom spacing so last items never sit under the sticky CTA
            { paddingBottom: STICKY_HEIGHT + insets.bottom + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t.language.title}</Text>
          <Text style={styles.subtitle}>{t.language.subtitle}</Text>
          <Text style={styles.description}>{t.language.description}</Text>

          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                selectedLanguage === lang.code && styles.selectedOption,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedLanguage === lang.code }}
            >
              <View style={styles.languageInfo}>
                <View style={[styles.languageIcon, { backgroundColor: lang.color }]}>
                  <Text style={styles.languageIconText}>{lang.icon}</Text>
                </View>
                <View>
                  <Text style={styles.languageLabel}>{getLanguageDisplay(lang.code)}</Text>
                  <Text style={styles.languageSubLabel}>{lang.subLabel}</Text>
                </View>
              </View>
              <View
                style={
                  selectedLanguage === lang.code
                    ? styles.radioSelected
                    : styles.radioUnselected
                }
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sticky Continue Button */}
        <View
          style={[
            styles.stickyButtonContainer,
            { paddingBottom: 16 + insets.bottom }, // lift above system nav/gesture area
          ]}
        >
          <TouchableOpacity
            style={[styles.continueButton, !selectedLanguage && { opacity: 0.6 }]}
            onPress={handleContinue}
            disabled={!selectedLanguage}
            accessibilityRole="button"
          >
            <Text style={styles.continueButtonText}>{t.common.continue}</Text>
            <Icon name="arrow-right" size={16} color="#ffffff" style={styles.iconSpacing} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    height: 48,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  languageSelection: {
    padding: 16,
  },
  stickyButtonContainer: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#9ca3af',
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  languageIconText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  languageSubLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  iconSpacing: {
    marginLeft: 8,
  },
});

export default LanguageSelectionScreen;
