import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { languages, getLanguageDisplay } from '../data/languages';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useAuth } from '../contexts/AuthContext';
import { translations, SupportedLocale } from '../i18n/translations';
import Header from '../components/Header';
import { spacing, colors, radius } from '../theme';
import { trackScreenView, trackButtonClick } from '../utils/analytics';

const STICKY_HEIGHT = 72; // approx height of the bottom CTA area (padding + button)

const LanguageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { setLanguage, user } = useAuth();
  const preferred = (route.params && route.params.preferred) || undefined;
  const [canLeave, setCanLeave] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    preferred || user?.language || null
  );

  useEffect(() => {
    trackScreenView('LanguageSelectionScreen', 'Onboarding');
    // No extra analytics
  }, [user, preferred]);

  // Prevent leaving only during onboarding (no user) until Continue is pressed
  const prevent = !user && !canLeave;
  usePreventRemove(prevent, () => {});

  // Disable header back button menu and native gestures while preventing remove
  useEffect(() => {
    navigation.setOptions?.({ headerBackButtonMenuEnabled: false, gestureEnabled: !prevent });
  }, [navigation, prevent]);

  const t = useMemo(() => {
    const lang = (selectedLanguage || 'en') as SupportedLocale;
    return translations[lang];
  }, [selectedLanguage]);

  const handleLanguageSelect = (langCode: string) => {
    trackButtonClick('select_language', { language: langCode });
    
    setSelectedLanguage(langCode);
  };

  const handleContinue = async () => {
    if (!selectedLanguage) return;
    
    trackButtonClick('confirm_language', { language: selectedLanguage });
    
    await setLanguage(selectedLanguage);

    // allow this screen to be popped/navigated away
    setCanLeave(true);

    if (user) {
      navigation.goBack();
      return;
    }

    navigation.navigate('MobileInput', { language: selectedLanguage });
  };

  return (
    <View style={{ flex: 1}}>
      <View style={styles.container}>
        {/* Header */}
        <Header title={t.language.title} showBackButton={false} showNotification={false} keepTitleCenterAligned={true} />
        <View style={{ height: spacing.sm }} />

        {/* Language Selection Content */}
        <ScrollView
          contentContainerStyle={[
            styles.languageSelection,
            // add bottom spacing so last items never sit under the sticky CTA
            { paddingBottom: STICKY_HEIGHT + insets.bottom + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
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
                  <Text style={styles.languageLabel}>{lang.nativeLabel}</Text>
                  <Text style={styles.languageSubLabel}>{lang.label}</Text>
                </View>
              </View>
              <View style={selectedLanguage === lang.code ? styles.radioSelected : styles.radioUnselected}>
                {selectedLanguage === lang.code && (
                  <Icon name="check" size={16} color={colors.primary} />
                )}
              </View>
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
            <Icon name="arrow-right" size={16} color={colors.white} style={styles.iconSpacing} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.light,
  },
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    height: 48,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  headerBack: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  languageSelection: {
    padding: 16,
  },
  stickyButtonContainer: {
    backgroundColor: colors.light,
     paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
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
    color: colors.grey,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.greyMuted,
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectedOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
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
    marginRight: spacing.md,
  },
  languageIconText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  languageSubLabel: {
    fontSize: 12,
    color: colors.grey,
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.greyBorder,
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginRight: 8,
  },
  iconSpacing: {
    marginLeft: spacing.sm,
  },
});

export default LanguageSelectionScreen;
