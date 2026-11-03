import React, { useCallback, useEffect, useState } from 'react';
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
import { consumerColors, consumerFonts } from '../theme';
import { useI18n } from '../i18n';
import { offlineCacheKey, readOfflineCache } from '../utils/offlineCache';
import type { Location } from '../components/LocationSearch';
import ErrorBanner from '../components/ErrorBanner';
import SvgIcon from '../assets/icons';

/**
 * Work request details (tags) screen — implemented from the
 * Work_Request_Creation handoff (index.html + styles.css):
 * mint back-circle header with the service name and "Create a work
 * request" subtitle, hero illustration at the top-right, three benefit
 * pills, then white cards for the requirement text, relevant tags,
 * call consent and the work location, with a green gradient
 * "Confirm Request" CTA pinned at the bottom.
 *
 * Layout metrics follow the 852 × 1846 handoff canvas proportionally
 * while typography uses the app's standard cross-screen type scale, and
 * text is never truncated — labels wrap and pills grow to fit.
 */

const REQUEST_TITLE_MAX_LENGTH = 80;

const heroIllustration = require('../assets/images/hero_illustration_reference.png');

const WorkRequestSelectTagsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useI18n();
  const { token, user } = useAuth();
  const { showLoader, hideLoader } = useGlobalLoader();
  const insets = useSafeAreaInsets();

  const serviceId = route.params?.serviceId;
  const serviceName = route.params?.serviceName;
  const serviceTags = (route.params?.serviceTags as string[] | undefined) || [];

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [requestTitle, setRequestTitle] = useState('');
  const [phoneConsent, setPhoneConsent] = useState(true);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [requestError, setRequestError] = useState<unknown | null>(null);

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
  }, [token, serviceId, confirmedLocation, selectedTags, requestTitle, navigation, showLoader, hideLoader, t]);

  if (guardMessage) {
    return (
      <View style={styles.guardContainer}>
        <View style={styles.guardBody}>
          <View style={styles.guardIconWrap}>
            <SvgIcon name="shield" size={28} color={consumerColors.primary} />
          </View>
          <Text style={styles.guardText}>{guardMessage}</Text>
        </View>
      </View>
    );
  }

  const locName = confirmedLocation?.name || confirmedLocation?.description || t('createRequest.addDetails.noLocation');

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) }]}>
      <LinearGradient colors={['#f8fcfa', '#f4faf7', '#f8fcfa']} style={styles.gradient} />
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
              <SvgIcon name="back" size={20} color="#071a1b" />
            </TouchableOpacity>
            <Text style={styles.serviceName}>{serviceName}</Text>
            <Text style={styles.subtitle}>Create a work request</Text>
          </View>
          <Image source={heroIllustration} style={styles.heroArt} resizeMode="contain" />
        </View>

        {/* Benefits row: three pills */}
        <View style={styles.benefits}>
          {([
            { icon: 'shield', text: 'Verified Experts' },
            { icon: 'bolt', text: 'Quick Response' },
            { icon: 'shield', text: 'Safe & Reliable' },
          ] as const).map((b, i) => (
            <View key={i} style={styles.benefit}>
              <SvgIcon name={b.icon} size={16} color={consumerColors.primary} />
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Description card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.sectionHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="document" size={20} color={consumerColors.primary} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>What needs to be done?</Text>
                <Text style={styles.headingP}>Tell us about the issue or service you need.</Text>
              </View>
              {showTitleCount && (
                <Text style={styles.counter}>{titleCharacterCount} / {REQUEST_TITLE_MAX_LENGTH}</Text>
              )}
            </View>
            <TextInput
              style={styles.textarea}
              value={requestTitle}
              onChangeText={handleTitleChange}
              placeholder={t('createRequest.selectTags.requestTitlePlaceholder')}
              placeholderTextColor="#71809d"
              maxLength={REQUEST_TITLE_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              selectionColor={consumerColors.primary}
              underlineColorAndroid="transparent"
            />
          </View>
        </View>

        {/* Tags card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.sectionHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="tag" size={20} color={consumerColors.primary} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>Choose all relevant tags</Text>
                <Text style={styles.headingP}>Select one or more (optional).</Text>
              </View>
            </View>
            <View style={styles.tagRows}>
              {serviceTags.length > 0 ? (
                <View style={styles.tagRow}>
                  {serviceTags.map(tag => {
                    const selected = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.tag, selected && styles.tagSelected]}
                        onPress={() => toggleTag(tag)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}>
                        <SvgIcon name={getTagIcon(tag)} size={15} color={selected ? consumerColors.primary : '#26364f'} />
                        <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                        <View style={[styles.tagBadge, selected && styles.tagBadgeSelected]}>
                          <SvgIcon name={selected ? 'check' : 'plus'} size={11} color={selected ? '#fff' : '#98a3b4'} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noTagsRow}>
                  <SvgIcon name="tag" size={20} color={consumerColors.muted} />
                  <Text style={styles.noTagsText}>{t('createRequest.selectTags.noTagsAvailable')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Call card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.callHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="phone" size={20} color={consumerColors.primary} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>Who can call me?</Text>
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
              <SvgIcon name="shield" size={16} color={consumerColors.primary} />
              <Text style={styles.privacyText}>Only Aadhaar verified experts can contact you.</Text>
            </View>
          </View>
        </View>

        {/* Location card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.sectionHeading}>
              <View style={styles.roundIcon}>
                <SvgIcon name="pin" size={20} color={consumerColors.primary} />
              </View>
              <View style={styles.headingText}>
                <Text style={styles.headingH2}>Location of Work</Text>
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
                <SvgIcon name="location" size={17} color={consumerColors.primary} />
              </View>
              <View style={styles.locationCopy}>
                <Text style={styles.locationCopyBold}>{t('createRequest.addDetails.selectedOnMap')}</Text>
                <Text style={styles.locationCopySmall}>{locName}</Text>
              </View>
              <SvgIcon name="chevron" size={16} color="#43516f" style={{ transform: [{ rotate: '90deg' }] }} />
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
            colors={[consumerColors.primary, consumerColors.primaryDark]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.confirmButton, requestInProgress && styles.confirmButtonDisabled]}>
            <SvgIcon name="send" size={18} color="#fff" />
            <Text style={styles.confirmText}>{t('createRequest.selectTags.confirmButton')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ErrorBanner error={requestError} onRetry={handleConfirm} />
    </View>
  );
};

function getTagIcon(tag: string): 'snowflake' | 'broom' | 'sparkles' | 'fan' | 'chip' | 'sensor' | 'thermometer' | 'zap' | 'indoor' | 'outdoor' | 'tag' {
  switch (tag) {
    case 'AC Servicing': return 'snowflake';
    case 'AC Cleaning': return 'broom';
    case 'AC Deep Clean': return 'sparkles';
    case 'Fan': return 'fan';
    case 'PCB': return 'chip';
    case 'Sensor': return 'sensor';
    case 'Thermostat': return 'thermometer';
    case 'Voltage Issue': return 'zap';
    case 'Indoor Unit': return 'indoor';
    case 'Outdoor Unit': return 'outdoor';
    default: return 'tag';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4faf7',
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
    backgroundColor: '#E6F8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceName: {
    color: '#080808',
    fontSize: 22,
    fontFamily: consumerFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 27,
  },
  subtitle: {
    color: '#43516f',
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

  benefits: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  benefit: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#EFFBF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#126441',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  benefitText: {
    color: '#101010',
    fontSize: 13,
    fontFamily: consumerFonts.bold,
    textAlign: 'center',
    flexShrink: 1,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(230,240,235,0.8)',
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
    backgroundColor: '#E4F8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  headingH2: {
    color: '#101a35',
    fontSize: 19,
    fontFamily: consumerFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 3,
  },
  headingP: {
    color: '#52617f',
    fontSize: 14,
    fontFamily: consumerFonts.regular,
    lineHeight: 18,
  },
  headingPCall: {
    color: '#52617f',
    fontSize: 13,
    fontFamily: consumerFonts.regular,
    lineHeight: 17,
  },
  counter: {
    color: '#52617f',
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    alignSelf: 'flex-start',
  },

  textarea: {
    borderWidth: 1.5,
    borderColor: '#dce3ef',
    borderRadius: 16,
    backgroundColor: '#fff',
    color: '#101a35',
    fontSize: 15,
    fontFamily: consumerFonts.regular,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 110,
    textAlignVertical: 'top',
  },

  tagRows: {
    gap: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    height: 38,
    borderWidth: 1.5,
    borderColor: '#dce3ef',
    borderRadius: 19,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    flexGrow: 0,
  },
  tagSelected: {
    backgroundColor: '#E4F8ED',
    borderColor: '#8de2b9',
  },
  tagText: {
    color: '#101010',
    fontSize: 13.5,
    fontFamily: consumerFonts.regular,
    lineHeight: 17,
  },
  tagTextSelected: {
    color: '#07864f',
    fontFamily: consumerFonts.bold,
  },
  tagBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#aab5c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBadgeSelected: {
    backgroundColor: consumerColors.primary,
    borderColor: consumerColors.primary,
  },
  noTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    justifyContent: 'center',
  },
  noTagsText: {
    color: consumerColors.muted,
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
    backgroundColor: '#e7f8ef',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  privacyText: {
    color: '#101010',
    fontSize: 12.5,
    fontFamily: consumerFonts.regular,
    flexShrink: 1,
  },
  switchWrap: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d6dce0',
    justifyContent: 'center',
    flexShrink: 0,
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d6dce0',
  },
  switchTrackActive: {
    backgroundColor: '#08a967',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
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
    borderColor: '#dce3ef',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  locationPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5f8ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  locationCopyBold: {
    color: '#090909',
    fontSize: 15.5,
    fontFamily: consumerFonts.bold,
    lineHeight: 19,
  },
  locationCopySmall: {
    color: '#52617f',
    fontSize: 13.5,
    fontFamily: consumerFonts.regular,
    lineHeight: 17,
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
    color: '#fff',
    fontSize: 16,
    fontFamily: consumerFonts.bold,
  },

  guardContainer: {
    flex: 1,
    backgroundColor: '#f8fcfa',
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
    backgroundColor: consumerColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guardText: {
    fontSize: 16,
    lineHeight: 22,
    color: consumerColors.muted,
    textAlign: 'center',
  },
});

export default WorkRequestSelectTagsScreen;
