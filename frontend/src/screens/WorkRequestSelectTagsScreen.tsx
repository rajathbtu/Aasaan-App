import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { createWorkRequest } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalLoader } from '../contexts/GlobalLoaderContext';
import { useTheme } from '../contexts/ThemeContext';
import { consumerFonts } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useI18n } from '../i18n';
import { offlineCacheKey, readOfflineCache } from '../utils/offlineCache';
import type { Location } from '../components/LocationSearch';
import ErrorBanner from '../components/ErrorBanner';
import SvgIcon from '../assets/icons';

/**
 * Work request details (tags) screen — implemented from the
 * Work_Request_Creation handoff (index.html + styles.css):
 * mint back-circle header with the service name and "Create a work
 * request" subtitle, hero illustration at the top-right, then white
 * cards for the requirement text (with voice-dictation mic), relevant
 * tags, call consent and the work location, with a green gradient
 * "Confirm Request" CTA pinned at the bottom.
 *
 * Layout metrics follow the 852 × 1846 handoff canvas proportionally
 * while typography uses the app's standard cross-screen type scale, and
 * text is never truncated — labels wrap and pills grow to fit.
 */

const REQUEST_TITLE_MAX_LENGTH = 80;
/* The tag board slides sideways and shows up to 4 rows of chips. */
const TAGS_ROW_COUNT = 4;

/* Speech locale per app language (BCP-47 tags). */
const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
};

/* Voice dictation needs the native expo-speech-recognition module, which
   only exists in dev-client / production builds. Resolve it defensively so
   the screen still works (typed input only) in builds without it. */
let speechModule: typeof import('expo-speech-recognition') | null = null;
try {
  speechModule = require('expo-speech-recognition');
} catch {
  speechModule = null;
}

const heroIllustration = require('../assets/illustrations/hero_illustration_reference.png');

const WorkRequestSelectTagsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, lang } = useI18n();
  const { token, user } = useAuth();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { base: C, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const serviceId = route.params?.serviceId;
  const serviceName = route.params?.serviceName;
  const serviceTags = (route.params?.serviceTags as string[] | undefined) || [];

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [requestTitle, setRequestTitle] = useState('');
  const [phoneConsent, setPhoneConsent] = useState(true);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [requestError, setRequestError] = useState<unknown | null>(null);

  /* Voice dictation state: the text the field had when dictation started,
     plus everything dictated so far (final + interim) on top of it. */
  const [listening, setListening] = useState(false);
  const dictationBaseRef = useRef('');
  const dictatedRef = useRef('');

  /* The confirmed work location: the route param when the user came through
     the flow, otherwise the location they confirmed on the service-area /
     confirm-location page (persisted in the saved-locations cache). */
  const [confirmedLocation, setConfirmedLocation] = useState<any>(route.params?.selectedLocation || null);
  const [locationChecked, setLocationChecked] = useState<boolean>(Boolean(route.params?.selectedLocation));

  useEffect(() => {
    if (route.params?.selectedLocation) {
      setConfirmedLocation(route.params.selectedLocation);
      setLocationChecked(true);
      return;
    }
    let active = true;
    (async () => {
      try {
        const locations = user?.id
          ? await readOfflineCache<Location[]>(offlineCacheKey('saved-locations', user.id))
          : null;
        if (active) {
          setConfirmedLocation((current: any) => current ?? locations?.[0] ?? null);
        }
      } catch {
        // cache read failed — fall through with whatever we have
      } finally {
        if (active) setLocationChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [route.params?.selectedLocation, user?.id]);

  /* Live dictation: append speech results on top of the pre-dictation text. */
  useEffect(() => {
    if (!speechModule) return;
    let subscriptions: { remove: () => void }[] = [];
    try {
      const Module = speechModule.ExpoSpeechRecognitionModule;
      subscriptions = [
        Module.addListener('result', (event: any) => {
          const transcript: string = event?.results?.[0]?.transcript ?? '';
          if (!transcript) return;
          if (event.isFinal) {
            dictatedRef.current = `${dictatedRef.current} ${transcript}`.trim();
          }
          const dictated = event.isFinal
            ? dictatedRef.current
            : `${dictatedRef.current} ${transcript}`.trim();
          const base = dictationBaseRef.current.trimEnd();
          const joined = base ? `${base} ${dictated}` : dictated;
          setRequestTitle(Array.from(joined).slice(0, REQUEST_TITLE_MAX_LENGTH).join(''));
        }),
        Module.addListener('end', () => setListening(false)),
        Module.addListener('error', (event: any) => {
          setListening(false);
          if (event?.error && event.error !== 'aborted' && event.error !== 'no-speech') {
            Alert.alert(t('common.error'), 'Could not hear you clearly. Please try again or type instead.');
          }
        }),
      ];
    } catch {
      // native module missing in this build — dictation simply stays off
      speechModule = null;
    }
    return () => subscriptions.forEach(sub => sub.remove());
  }, [t]);

  /* Stop any running dictation when the screen unmounts. */
  useEffect(() => {
    const Module = speechModule?.ExpoSpeechRecognitionModule;
    return () => {
      try {
        Module?.stop();
      } catch {
        // native module already gone — nothing to stop
      }
    };
  }, []);

  const titleCharacterCount = Array.from(requestTitle).length;
  const showTitleCount = REQUEST_TITLE_MAX_LENGTH - titleCharacterCount < 20;

  let guardMessage: string | null = null;
  if (!serviceId || !serviceName) guardMessage = t('createRequest.addDetails.unknownService');
  else if (locationChecked && (!confirmedLocation || !confirmedLocation.lat || !confirmedLocation.lng))
    guardMessage = t('createRequest.addDetails.locationRequiredTitle');

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]));
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    if (Array.from(value).length > REQUEST_TITLE_MAX_LENGTH) return;
    setRequestTitle(value);
  }, []);

  const toggleListening = useCallback(async () => {
    if (!speechModule) {
      Alert.alert(
        'Voice input unavailable',
        'Speech recognition is not available in this build. Please update the app or type instead.',
      );
      return;
    }
    if (listening) {
      try {
        speechModule.ExpoSpeechRecognitionModule.stop();
      } catch {
        setListening(false);
      }
      return;
    }
    try {
      const ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission?.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access so you can dictate your request.');
        return;
      }
      dictatedRef.current = '';
      dictationBaseRef.current = requestTitle;
      setListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: SPEECH_LOCALES[lang] ?? 'en-IN',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });
    } catch {
      setListening(false);
      Alert.alert(t('common.error'), 'Voice input could not start. Please try again or type instead.');
    }
  }, [listening, requestTitle, lang, t]);

  const handleEditLocation = useCallback(() => {
    navigation.navigate('LocationSelect', {
      mode: 'requestcreation',
      serviceId,
      serviceName,
      serviceTags,
      selectedLocation: confirmedLocation,
      returnToTagsRouteKey: route.key,
    });
  }, [navigation, serviceId, serviceName, serviceTags, confirmedLocation, route.key]);

  const handleConfirm = useCallback(async () => {
    if (!token) {
      Alert.alert(t('createRequest.addDetails.authRequiredTitle'), t('createRequest.addDetails.authRequiredDesc'));
      return;
    }
    if (!requestTitle.trim()) {
      Alert.alert(t('common.error'), 'Please describe what needs to be done.');
      return;
    }
    if (!confirmedLocation || !confirmedLocation.lat || !confirmedLocation.lng) {
      Alert.alert(t('createRequest.addDetails.locationRequiredTitle'), t('createRequest.addDetails.locationRequiredDesc'));
      return;
    }
    setRequestInProgress(true);
    showLoader(t('loader.creatingRequest'));
    try {
      const locName = confirmedLocation?.name || confirmedLocation?.description;
      const placeId = confirmedLocation?.place_id || confirmedLocation?.placeId;
      const wr: any = await createWorkRequest(token, {
        service: serviceId,
        title: requestTitle.trim(),
        location: { name: locName, lat: confirmedLocation.lat, lng: confirmedLocation.lng, placeId },
        tags: selectedTags,
        phoneConsent,
      });
      navigation.navigate('WorkRequestCreated', { request: wr });
      setRequestError(null);
    } catch (err: any) {
      setRequestError(err);
    } finally {
      setRequestInProgress(false);
      hideLoader();
    }
  }, [token, serviceId, confirmedLocation, selectedTags, requestTitle, phoneConsent, navigation, showLoader, hideLoader, t]);

  if (guardMessage) {
    return (
      <View style={styles.guardContainer}>
        <View style={styles.guardBody}>
          <View style={styles.guardIconWrap}>
            <SvgIcon name="shield" size={28} color={C.brand} />
          </View>
          <Text style={styles.guardText}>{guardMessage}</Text>
        </View>
      </View>
    );
  }

  const locName = confirmedLocation?.name || confirmedLocation?.description || t('createRequest.addDetails.noLocation');

  /* 4 rows of tags: each row carries an even share of the tags. */
  const tagsPerRow = Math.max(1, Math.ceil(serviceTags.length / TAGS_ROW_COUNT));

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) }]}>
      {/* Page wash: was linear-gradient(#f8fcfa, #f4faf7, #f8fcfa) — mapped to
          the nearest base canvas/paper tokens (sub-perceptual in light mode). */}
      <LinearGradient colors={[C.canvas, C.paper, C.canvas]} style={styles.gradient} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Header: mint back circle, service name + subtitle, hero art right */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              accessibilityLabel="Go back">
              <SvgIcon name="back" size={20} color={C.serviceName} />
            </TouchableOpacity>
            <Text style={styles.serviceName}>{serviceName}</Text>
            <Text style={styles.subtitle}>Create a work request</Text>
          </View>
          <Image source={heroIllustration} style={styles.heroArt} resizeMode="contain" />
        </View>

        {/* Description card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.sectionHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="document" size={20} color={C.brand} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>{t('createRequest.selectTags.requestTitleLabel')}</Text>
                <Text style={styles.headingP}>Tell us about the issue or service you need.</Text>
              </View>
              {showTitleCount && (
                <Text style={styles.counter}>{titleCharacterCount} / {REQUEST_TITLE_MAX_LENGTH}</Text>
              )}
            </View>
            <View style={styles.textareaWrap}>
              <TextInput
                style={styles.textarea}
                value={requestTitle}
                onChangeText={handleTitleChange}
                placeholder={t('createRequest.selectTags.requestTitlePlaceholder')}
                placeholderTextColor={C.placeholder}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                maxLength={REQUEST_TITLE_MAX_LENGTH}
                multiline
                textAlignVertical="top"
                selectionColor={C.brand}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                style={[styles.micButton, listening && styles.micButtonActive]}
                onPress={toggleListening}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={listening ? 'Stop voice input' : 'Dictate with voice'}>
                <SvgIcon name="mic" size={18} color={listening ? C.danger : C.brand} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tags card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.sectionHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="tag" size={20} color={C.brand} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>{t('createRequest.selectTags.tagsTitle')}</Text>
                <Text style={styles.headingP}>Select one or more (optional).</Text>
              </View>
            </View>
            {serviceTags.length > 0 ? (
              /* Horizontal tag board: 4 rows of chips sliding sideways. */
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagGrid}>
                {Array.from({ length: Math.ceil(serviceTags.length / tagsPerRow) }, (_, rowIndex) => (
                  <View key={rowIndex} style={styles.tagRow}>
                    {serviceTags.slice(rowIndex * tagsPerRow, (rowIndex + 1) * tagsPerRow).map(tag => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.tag, selected && styles.tagSelected]}
                          onPress={() => toggleTag(tag)}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}>
                          <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                          <View style={[styles.tagBadge, selected && styles.tagBadgeSelected]}>
                            <SvgIcon name={selected ? 'check' : 'plus'} size={11} color={selected ? C.onPrimary : C.greyMuted} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noTagsRow}>
                <SvgIcon name="tag" size={20} color={C.grey} />
                <Text style={styles.noTagsText}>{t('createRequest.selectTags.noTagsAvailable')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Call card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.callHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="phone" size={20} color={C.brand} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>{t('createRequest.addDetails.consentTitle')}</Text>
                <Text style={styles.headingPCall}>{t('createRequest.selectTags.phoneConsent')}</Text>
              </View>
              <TouchableOpacity
                style={styles.switchWrap}
                onPress={() => setPhoneConsent(!phoneConsent)}
                activeOpacity={0.75}
                accessibilityRole="switch"
                accessibilityState={{ checked: phoneConsent }}>
                <View style={[styles.switchTrack, phoneConsent && styles.switchTrackActive]}>
                  <View style={[styles.switchThumb, phoneConsent && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.privacy}>
              <SvgIcon name="shield" size={16} color={C.brand} />
              <Text style={styles.privacyText}>Only Aadhaar verified experts can contact you.</Text>
            </View>
          </View>
        </View>

        {/* Location card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.sectionHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="pin" size={20} color={C.brand} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>{t('createRequest.addDetails.locationTitle')}</Text>
                <Text style={styles.headingP}>Where do you need the service?</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.locationChoice}
              onPress={handleEditLocation}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('common.change')}>
              <View style={styles.locationPin}>
                <SvgIcon name="location" size={17} color={C.brand} />
              </View>
              <View style={styles.locationCopy}>
                <Text style={styles.locationCopyBold} numberOfLines={2}>{locName}</Text>
              </View>
              <SvgIcon name="chevron" size={16} color={C.secureText} style={{ transform: [{ rotate: '90deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Confirm CTA */}
      <View style={[styles.footer, { marginBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={requestInProgress}
          accessibilityLabel={t('createRequest.selectTags.confirmButton')}>
          <LinearGradient
            colors={[C.brand, C.brandDark]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.confirmButton, requestInProgress && styles.confirmButtonDisabled]}>
            <SvgIcon name="send" size={18} color={C.onPrimary} />
            <Text style={styles.confirmText}>{t('createRequest.selectTags.confirmButton')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ErrorBanner error={requestError} onRetry={handleConfirm} />
    </View>
  );
};

const makeStyles = (C: BasePalette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.backBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceName: {
    color: C.serviceName,
    fontSize: 18,
    fontFamily: consumerFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 23,
  },
  subtitle: {
    color: C.secureText,
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    lineHeight: 19,
    marginTop: 3,
  },
  heroArt: {
    width: 150,
    height: 104,
    flexShrink: 0,
  },

  card: {
    // Was rgba(255,255,255,0.92): the 8% translucency is sub-perceptual and
    // has no token; the opaque card token keeps dark mode readable.
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.tabBorder,
    shadowColor: '#1C4D37',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 14,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.iconTileBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  headingH2: {
    color: C.dark,
    fontSize: 16,
    fontFamily: consumerFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 21,
    marginBottom: 3,
  },
  headingP: {
    color: C.grey,
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    lineHeight: 18,
  },
  headingPCall: {
    color: C.grey,
    fontSize: 13,
    fontFamily: consumerFonts.regular,
    lineHeight: 17,
  },
  counter: {
    color: C.grey,
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    alignSelf: 'flex-start',
  },

  textareaWrap: {
    position: 'relative',
  },
  textarea: {
    borderWidth: 1.5,
    borderColor: C.fieldBorder,
    borderRadius: 16,
    backgroundColor: C.white,
    color: C.dark,
    fontSize: 15,
    fontFamily: consumerFonts.regular,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 48,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  micButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.iconTileBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: C.dangerSoft,
  },

  /* Horizontal tag board: rows of chips sliding sideways. */
  tagGrid: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    height: 32,
    borderWidth: 1.5,
    borderColor: C.fieldBorder,
    borderRadius: 16,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    flexGrow: 0,
  },
  tagSelected: {
    backgroundColor: C.greenSoft,
    borderColor: C.primaryBorder,
  },
  tagText: {
    color: C.serviceName,
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    lineHeight: 15,
  },
  tagTextSelected: {
    color: C.brandDark,
    fontFamily: consumerFonts.bold,
  },
  tagBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.radioBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBadgeSelected: {
    backgroundColor: C.brand,
    borderColor: C.brand,
  },
  noTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    justifyContent: 'center',
  },
  noTagsText: {
    color: C.grey,
    fontSize: 14,
    marginLeft: 8,
  },

  callHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.greenSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  privacyText: {
    color: C.serviceName,
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    flexShrink: 1,
  },
  switchWrap: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.fieldBorder,
    justifyContent: 'center',
    flexShrink: 0,
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.fieldBorder,
  },
  switchTrackActive: {
    backgroundColor: C.brand2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.white,
    marginLeft: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },

  locationChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.fieldBorder,
    borderRadius: 16,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  locationPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.iconTileBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  locationCopyBold: {
    color: C.serviceName,
    fontSize: 14.5,
    fontFamily: consumerFonts.bold,
    lineHeight: 19,
  },

  footer: {
    marginHorizontal: 20,
  },
  confirmButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#07864F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: C.onPrimary,
    fontSize: 16,
    fontFamily: consumerFonts.bold,
  },

  guardContainer: {
    flex: 1,
    backgroundColor: C.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  guardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  guardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.backBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guardText: {
    fontSize: 16,
    lineHeight: 22,
    color: C.grey,
    textAlign: 'center',
  },
});

export default WorkRequestSelectTagsScreen;
