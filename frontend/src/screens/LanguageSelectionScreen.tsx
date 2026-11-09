import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';

import { languages } from '../data/languages';
import { useAuth } from '../contexts/AuthContext';
import { translations, SupportedLocale } from '../i18n/translations';
import BlockingLoader from '../components/BlockingLoader';
import Header from '../components/Header';
import SvgIcon from '../assets/icons';
import { useToast } from '../contexts/ToastContext';
import { prepareTargetLanguage } from '../services/translation';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

/* Soft two-layer mint wave along the bottom edge (approved reference).
   Fill colours come from the active palette so the wave tracks dark mode. */
const bottomWaveXml = (C: BasePalette) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 48" preserveAspectRatio="none">
  <path d="M0 48V30C80 12 170 8 250 16c56 6 104 4 140-6v38H0Z" fill="${C.primarySoft}"/>
  <path d="M0 48V38c90-10 190-6 260 2 50 6 96 4 130-4v12H0Z" fill="${C.mintStrong}"/>
</svg>`;

/**
 * Language selection — approved design.
 *
 * BUSINESS LOGIC UNCHANGED: same single-select state, same onboarding guard
 * (usePreventRemove until Continue), same persistence (`setLanguage`) and the
 * same edit/onboarding navigation. Only the UI was rebuilt to match the
 * approved reference.
 */
const LanguageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { setLanguage, user } = useAuth();
  const { showToast } = useToast();
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const preferred = (route.params && route.params.preferred) || undefined;
  // Mode: 'edit' used when opened for profile-update flows, 'onboarding' otherwise
  const mode: 'edit' | 'onboarding' = (route.params?.mode as any) === 'edit' ? 'edit' : 'onboarding';
  const [canLeave, setCanLeave] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    preferred || user?.language || null
  );

  // Prevent leaving only during onboarding (no user) until Continue is pressed
  const prevent = !user && !canLeave;
  usePreventRemove(prevent, () => {});

  // Disable header back button menu and native gestures while preventing remove
  useEffect(() => {
    navigation.setOptions?.({ headerBackButtonMenuEnabled: false, gestureEnabled: !prevent });
  }, [navigation, prevent]);

  const t = useMemo(() => {
    const lang = (selectedLanguage || 'en') as SupportedLocale;
    return translations[lang] || translations.en;
  }, [selectedLanguage]);

  const activeLocale = (selectedLanguage || 'en') as SupportedLocale;

  /* Inter for Latin locales (bundled in the app); system fonts keep full
     native-script glyph coverage for the Indian languages. */
  const F =
    activeLocale === 'en'
      ? { regular: 'Inter' as const, bold: 'Inter-Bold' as const }
      : { regular: undefined, bold: undefined };

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
  };

  const handleContinue = async () => {
    if (!selectedLanguage) return;
    setSaving(true);
    void prepareTargetLanguage(selectedLanguage).catch((error) => {
      console.warn('Failed to prepare the selected translation language:', error);
    });
    try {
      await setLanguage(selectedLanguage);

      if (user && mode === 'edit') {
        setCanLeave(true);
        showToast(t.common.updatedDesc);
        navigation.goBack();
        return;
      }

      navigation.navigate('MobileInput', { language: selectedLanguage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Soft radial mint glow behind the intro (screen background treatment) */}
      <View pointerEvents="none" style={styles.topGlow} />
      {/* Mint wave hugging the bottom edge (approved reference) */}
      <View pointerEvents="none" style={styles.waveWrap}>
        <SvgXml xml={bottomWaveXml(C)} width="100%" height={48} />
      </View>

      {/* Shared app header, same as the Profile screen. Back control only in
          edit mode; onboarding keeps its existing no-exit behaviour. */}
      <Header
        title={t.language.title}
        showBackButton={mode === 'edit'}
        showNotification={false}
      />

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Intro: supporting sentence */}
        <View style={styles.intro}>
          <Text style={[styles.helper, { fontFamily: F.regular }]}>{t.language.description}</Text>
        </View>

        {/* Single-select language cards */}
        <View style={styles.cards}>
          {languages.map((lang) => {
            const selected = selectedLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                activeOpacity={0.9}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => handleLanguageSelect(lang.code)}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <View style={[styles.mark, { backgroundColor: lang.markBg }]}>
                  <Text style={[styles.markText, lang.code === 'en' && styles.markTextEn, { color: lang.markFg }]}>
                    {lang.mark}
                  </Text>
                </View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { fontFamily: F.bold }]}>{lang.label}</Text>
                  <Text style={[styles.cardSubtitle, lang.code === 'en' && { fontFamily: F.regular }]}>
                    {lang.nativeLabel || lang.label}
                  </Text>
                </View>
                <View style={[styles.selection, selected && styles.selectionSelected]}>
                  {selected ? <SvgIcon name="ls-check" size={16} color={C.onPrimary} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky bottom CTA over the safe area */}
      <View pointerEvents="box-none" style={[styles.footerWrap, { paddingBottom: insets.bottom }]}>
        <View style={styles.footerBox}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleContinue}
            disabled={!selectedLanguage || saving}
            accessibilityRole="button"
            accessibilityLabel={t.language.continue}>
            <LinearGradient
              colors={[C.brandBright, C.brand]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.continueButton}>
              <Text style={[styles.continueText, { fontFamily: F.bold }]}>{t.language.continue}</Text>
              <SvgIcon name="ss-arrow-right" size={22} color={C.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <BlockingLoader visible={saving} />
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.canvas,
    overflow: 'hidden',
  },
  /* radial-gradient(ellipse at 50% 16%, rgba(224,249,237,.45), transparent 30%) */
  topGlow: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -180,
    width: 360,
    height: 260,
    borderRadius: 180,
    backgroundColor: C.backBg,
    opacity: 0.45,
  },
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    zIndex: 0,
  },

  listContent: {
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    zIndex: 1,
  },

  /* .intro{text-align:center;padding-top:3px} */
  intro: {
    alignItems: 'center',
    paddingTop: 3,
  },
  /* .intro p{margin:12px auto 27px;font-size:15px;line-height:1.45;font-weight:500;max-width:340px} */
  helper: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: C.grey,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 27,
    maxWidth: 340,
  },

  /* .language-list{flex-direction:column;gap:11px} */
  cards: {
    gap: 11,
  },
  /* .language-card{min-height:72px;gap:13px;padding:10px 13px;border:1.5px solid var(--border);border-radius:20px;box-shadow:0 3px 12px rgba(20,45,36,.045)} */
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: C.greyLight,
    borderRadius: 22,
    backgroundColor: C.white,
    shadowColor: '#142D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 1,
  },
  /* .language-card.selected{border:2px solid var(--brand-bright);background:#f0fbf5;padding:10.5px 14.5px} */
  cardSelected: {
    borderWidth: 2,
    borderColor: C.brandBright,
    backgroundColor: C.selectedBg,
    paddingVertical: 10.5,
    paddingHorizontal: 14.5,
  },
  /* .language-mark{width:46px;height:46px;border-radius:15px;font-size:19px;font-weight:800} */
  mark: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 19,
    fontWeight: '800',
  },
  /* .mark-en{font-size:17px} */
  markTextEn: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
  },
  /* .language-copy{flex:1;flex-direction:column;gap:2px} */
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  /* .language-copy strong{font-size:15px;font-weight:700} */
  cardTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: C.dark,
  },
  /* .language-copy small{color:var(--muted);font-size:13px;font-weight:500} */
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: C.grey,
  },
  /* .selection{width:27px;height:27px;border:2px solid #d4d9df;border-radius:50%} */
  selection: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    borderWidth: 2,
    borderColor: C.selectionBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* .selected-check{border-color:var(--brand-bright);background:var(--brand-bright)} */
  selectionSelected: {
    borderColor: C.brandBright,
    backgroundColor: C.brandBright,
  },

  /* .footer{position:fixed;bottom:0;padding:14px 20px calc(18px + safe-area);background:rgba(255,255,255,.96);border-top:1px solid #e8ecef} */
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  footerBox: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.footerBorder,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  /* .continue-button{height:58px;border-radius:15px;gap:17px;linear-gradient(100deg,#0bbd7b,#079c60);font-size:18px;font-weight:750;box-shadow:0 4px 10px rgba(0,150,88,.16)} */
  continueButton: {
    height: 58,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 17,
    shadowColor: '#009658',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  continueText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onPrimary,
  },
});

export default LanguageSelectionScreen;
