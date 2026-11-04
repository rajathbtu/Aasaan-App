import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';

import { languages, getLanguageDisplay } from '../data/languages';
import { useAuth } from '../contexts/AuthContext';
import { translations, SupportedLocale } from '../i18n/translations';
import BlockingLoader from '../components/BlockingLoader';
import SvgIcon from '../assets/icons';
import { useToast } from '../contexts/ToastContext';
import { prepareTargetLanguage } from '../services/translation';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Translation illustration — hand-authored editable SVG (no vector
 * original exists in the repository). The drop-shadow filter is removed
 * because react-native-svg cannot render SVG filters; everything else is
 * used exactly as supplied.
 */
const LANGUAGE_ART = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 210">
  <defs>
    <linearGradient id="lsMint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8fbf2"/><stop offset="1" stop-color="#c9f2df"/>
    </linearGradient>
    <linearGradient id="lsGreen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16c784"/><stop offset="1" stop-color="#008b50"/>
    </linearGradient>
  </defs>
  <path d="M38 102C42 59 80 38 118 43c24-35 68-40 101-14 26 21 42 26 63 39 39 25 43 75 5 101-26 18-57 16-84 12-46 15-91 8-122-7-36-17-49-38-43-72Z" fill="url(#lsMint)"/>
  <path d="M52 42l-17-12M65 30l-4-20M39 61l-20 2" fill="none" stroke="#0aa86d" stroke-width="5" stroke-linecap="round"/>
  <rect x="83" y="48" width="91" height="91" rx="20" fill="url(#lsGreen)" transform="rotate(5 128 93)"/>
  <text x="128" y="111" fill="white" font-size="57" font-weight="800" text-anchor="middle">A</text>
  <rect x="158" y="111" width="105" height="78" rx="18" fill="#fff" stroke="#00a76b" stroke-width="5" transform="rotate(4 210 150)"/>
  <path d="M239 174l17 23 3-28" fill="#fff" stroke="#00a76b" stroke-width="5" stroke-linejoin="round"/>
  <text x="211" y="165" fill="#078d56" font-size="48" font-weight="800" text-anchor="middle">अ</text>
  <path d="M194 58c28 0 45 16 51 40" fill="none" stroke="#078d56" stroke-width="9" stroke-linecap="round"/>
  <path d="M237 89l12 13 10-15" fill="none" stroke="#078d56" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M126 164c-23-1-37-13-43-32" fill="none" stroke="#078d56" stroke-width="9" stroke-linecap="round"/>
  <path d="M84 144l-2-14-13 8" fill="none" stroke="#078d56" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

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
  const { width } = useWindowDimensions();
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

  /* h1 follows the handoff CSS clamp(27px, 7.3vw, 34px). */
  const titleSize = Math.min(Math.max(27, width * 0.073), 34);

  /* Headline with the trailing word emphasised in brand green (English,
     exactly like the approved reference; other locales stay intact). */
  const headline = t.language.title;
  const spaceIdx = activeLocale === 'en' ? headline.lastIndexOf(' ') : -1;
  const headlineBase = spaceIdx > 0 ? headline.slice(0, spaceIdx + 1) : headline;
  const headlineAccent = spaceIdx > 0 ? headline.slice(spaceIdx + 1) : '';

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

      <View style={{ paddingTop: insets.top }} />

      {/* Top bar: circular back control at left; current-language pill at right */}
      <View style={styles.topbar}>
        {mode === 'edit' ? (
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <SvgIcon name="sa-back" size={26} color={C.brandDeep} />
          </TouchableOpacity>
        ) : (
          // Onboarding keeps the app's existing no-exit behaviour: no back control.
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.currentPill} accessibilityLabel={`Current language ${getLanguageDisplay(activeLocale)}`}>
          <SvgIcon name="ls-globe" size={20} color={C.brandDeep} />
          <Text style={[styles.pillText, { fontFamily: F.bold }]}>
            {getLanguageDisplay(activeLocale)}
          </Text>
          <SvgIcon name="chevron-down" size={12} color={C.dark} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Intro: illustration + headline + supporting sentence */}
        <View style={styles.intro}>
          <SvgXml xml={LANGUAGE_ART} width={190} height={136} style={styles.languageArt} />
          <Text style={[styles.headline, { fontFamily: F.bold, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.12) }]}>
            {headlineBase}
            {headlineAccent ? <Text style={styles.headlineAccent}>{headlineAccent}</Text> : null}
          </Text>
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

  /* .topbar{height:58px;justify-content:space-between} */
  topbar: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  /* .icon-button{width:58px;height:58px;border-radius:50%;background:#e8f8ef} */
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.backBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 58,
    height: 58,
  },
  /* .current-language{height:52px;padding:0 18px;border-radius:28px;background:#e9f8f0;gap:10px;font-size:15px;font-weight:700} */
  currentPill: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: C.pillBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '60%',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.dark,
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
  /* .language-art{width:190px;height:136px;margin:0 auto 5px} */
  languageArt: {
    marginBottom: 5,
  },
  /* h1{font-weight:800;letter-spacing:-1.35px;line-height:1.12} — size via clamp */
  headline: {
    color: C.dark,
    fontWeight: '800',
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  /* h1 span{color:var(--brand-deep)} */
  headlineAccent: {
    color: C.brandDeep,
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
