import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';
import ErrorBanner from '../components/ErrorBanner';
import { getServices } from '../api';
import { uploadProfileImage } from '../services/profileImageUpload';
import { getOptimizedProfileImageUrl } from '../utils/profileImage';
import SafeBottomBanner from '../components/SafeBottomBanner';
import UpgradeProBanner from '../components/UpgradeProBanner';
import BlockingLoader from '../components/BlockingLoader';
import AnimatedServiceIconLoader from '../components/AnimatedServiceIconLoader';
import SingleSelectRadioModal from '../components/SingleSelectRadioModal';
import Header from '../components/Header';
import ProfileInfoRow from '../components/ProfileInfoRow';
import { BrandText } from '../components/BrandWord';
import {
  ProfileActionRow,
  ProfileCard,
  ProfileSectionHeading,
  ProfileStatTile,
} from '../components/ProfileSection';
import {
  ProfileAvatarPlaceholder,
  ProfileIcon,
  ProfileIconName,
} from '../assets/profile-handoff';
import { profileColors as C, profileFonts as F } from '../theme/profile';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

type ProfileSelector = 'workSinceYear' | 'birthYear' | 'gender';
type SavingField = ProfileSelector | 'name' | 'bio' | null;
type Service = { id: string; name: string; category: string; tags?: string[] };

/** Masks all but the last four digits, matching the approved reference. */
const maskPhoneNumber = (raw?: string | null): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const last4 = digits.slice(-4);
  const countryCode = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)}` : '+91';
  return `${countryCode} ••••• •${last4}`;
};

/** Acronyms that should stay upper-case when a service id is humanised. */
const SERVICE_ID_ACRONYMS = new Set(['ac', 'tv', 'cctv', 'pc', 'ro', 'ups']);

/**
 * Turns a raw service id into a readable fallback label (`acRepair` ->
 * `AC Repair`). Used only until the services catalogue resolves the real name.
 */
const formatServiceName = (id: string): string => {
  const words = String(id)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return id;
  return words
    .map(word => (
      SERVICE_ID_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    ))
    .join(' ');
};

/** Picks the closest handoff icon for a service name. */
const serviceIcon = (name: string): ProfileIconName => {
  const value = name.toLowerCase();
  if (/(air\s*condition|\bac\b|cooling|a\/c)/.test(value)) return 'ac';
  if (/(chimney|hob|kitchen)/.test(value)) return 'chimney';
  if (/(geyser|water\s*heater|heater)/.test(value)) return 'geyser';
  return 'briefcase';
};

/**
 * Profile screen — rebuilt to the approved design reference
 * while keeping the existing data sources and flows:
 * name/bio edits, language, role, services, service area/radius, experience,
 * Aadhaar verification, rating, Professional plans, logout and deactivation.
 */
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, token, updateUser, logout, refreshUser } = useAuth();
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const isBottomTabsDisplayed = useNavigationState(state => state.type === 'tab');

  const [allServices, setAllServices] = useState<Service[] | null>(null);
  const [profileError, setProfileError] = useState<unknown | null>(null);
  const servicesCacheKey = user?.id ? offlineCacheKey('services', user.id) : null;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [activeSelector, setActiveSelector] = useState<ProfileSelector | null>(null);
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPhotoSourcePickerVisible, setIsPhotoSourcePickerVisible] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);

  // Shared services list to map ids -> display names.
  useEffect(() => {
    (async () => {
      if (servicesCacheKey) {
        const cached = await readOfflineCache<Service[]>(servicesCacheKey);
        if (cached) setAllServices(cached);
      }
      try {
        const data = await getServices();
        const incoming = data.services as Service[];
        setAllServices(incoming);
        setProfileError(null);
        if (servicesCacheKey) await writeOfflineCache(servicesCacheKey, incoming);
      } catch (error) {
        // Keep the cached list on failure.
        setProfileError(error);
      }
    })();
  }, [servicesCacheKey]);

  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
        setProfileError(null);
      } catch (error) {
        setProfileError(error);
      }
    })();
  }, []);

  // Keep inline drafts in sync with the canonical profile.
  useEffect(() => {
    if (!user) return;
    setNameDraft(user.name || '');
    setBioDraft(user.serviceProviderInfo?.bio || '');
    setEditingName(false);
    setEditingBio(false);
    if (user.aadhaarVerified) {
      setActiveSelector(current => (
        current === 'birthYear' || current === 'gender' ? null : current
      ));
    }
  }, [user?.id, user?.name, user?.serviceProviderInfo?.bio, user?.aadhaarVerified]);

  const serviceNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (allServices || []).forEach(service => { map[service.id] = service.name; });
    return map;
  }, [allServices]);

  const isProvider = user?.role === 'serviceProvider';
  const spInfo = user?.serviceProviderInfo;
  const services = Array.isArray(spInfo?.services) ? (spInfo!.services as string[]) : [];
  const locationName = spInfo?.location?.name || spInfo?.location?.description || '';
  const radius = (spInfo?.radius as number | undefined) ?? 5;
  const workSinceYear = spInfo?.workSinceYear ?? null;
  const birthYear = spInfo?.birthYear ?? null;
  const gender = spInfo?.gender ?? null;
  const bio = spInfo?.bio || '';
  const ratingCount = user?.userRating?.count ?? 0;
  const ratingAverage = user?.userRating?.average ?? null;

  const currentYear = new Date().getFullYear();
  const workSinceYears = Array.from(
    { length: currentYear - 1949 },
    (_, index) => String(currentYear - index),
  );
  const latestEligibleBirthYear = currentYear - 14; // minimum age of 14 for service providers
  const birthYears = Array.from(
    { length: latestEligibleBirthYear - 1945 + 1 },
    (_, index) => String(latestEligibleBirthYear - index),
  );

  const selectorConfig: Record<ProfileSelector, {
    title: string;
    options: { label: string; value: string }[];
    value: string;
  }> = {
    workSinceYear: {
      title: t('profile.workSinceYear'),
      options: workSinceYears.map(year => ({ label: year, value: year })),
      value: workSinceYear ? String(workSinceYear) : '',
    },
    birthYear: {
      title: t('profile.birthYear'),
      options: birthYears.map(year => ({ label: year, value: year })),
      value: birthYear ? String(birthYear) : '',
    },
    gender: {
      title: t('profile.gender'),
      options: [
        { label: t('profile.genderMale'), value: 'male' },
        { label: t('profile.genderFemale'), value: 'female' },
        { label: t('profile.genderTransgender'), value: 'transgender' },
      ],
      value: gender || '',
    },
  };
  const activeSelection = activeSelector ? selectorConfig[activeSelector] : null;

  const genderLabel = gender === 'male'
    ? t('profile.genderMale')
    : gender === 'female'
      ? t('profile.genderFemale')
      : gender === 'transgender'
        ? t('profile.genderTransgender')
        : '';

  const servicesCountLabel = services.length === 0
    ? t('profile.noServices')
    : services.length === 1
      ? t('profile.serviceAdded')
      : t('profile.servicesAdded', { count: services.length });

  const isBlocking = isLoggingOut
    || isUploadingPhoto
    || savingField === 'workSinceYear'
    || savingField === 'birthYear'
    || savingField === 'gender';

  const handleSelectOption = async (value: string) => {
    const selector = activeSelector;
    if (!selector) return;
    setActiveSelector(null);

    const updates: Record<string, string | number | null> = {};
    if (selector === 'workSinceYear') {
      const next = value ? Number(value) : null;
      if (next === workSinceYear) return;
      updates.workSinceYear = next;
    } else if (selector === 'birthYear') {
      const next = value ? Number(value) : null;
      if (next === birthYear) return;
      updates.birthYear = next;
    } else {
      const next = value || null;
      if (next === (gender || null)) return;
      updates.gender = next;
    }

    setSavingField(selector);
    try {
      await updateUser(updates as any);
      setProfileError(null);
      showToast(t('common.updatedDesc'));
    } catch (error) {
      setProfileError(error);
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveName = async () => {
    if (!user || user.aadhaarVerified) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    if (trimmed === (user.name || '').trim()) {
      setEditingName(false);
      return;
    }

    setSavingField('name');
    try {
      await updateUser({ name: trimmed });
      setEditingName(false);
      setProfileError(null);
      showToast(t('common.updatedDesc'));
    } catch (error) {
      setProfileError(error);
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;
    const trimmed = bioDraft.trim();
    if (trimmed === bio.trim()) {
      setEditingBio(false);
      return;
    }

    setSavingField('bio');
    try {
      await updateUser({ bio: trimmed || null });
      setEditingBio(false);
      setProfileError(null);
      showToast(t('common.updatedDesc'));
    } catch (error) {
      setProfileError(error);
    } finally {
      setSavingField(null);
    }
  };

  const chooseProfilePhoto = async (source: 'camera' | 'library') => {
    if (!token || isUploadingPhoto) return;
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showToast(t('profile.cameraPermissionRequired'));
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showToast(t('profile.photoLibraryPermissionRequired'));
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: source === 'library',
        aspect: [1, 1],
        quality: 0.9,
        exif: false,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;

      setIsUploadingPhoto(true);
      await uploadProfileImage(token, result.assets[0]);
      await refreshUser();
      setProfileError(null);
      showToast(t('profile.photoSubmitted'));
    } catch (error) {
      setProfileError(error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout]);

  const handleDeactivate = useCallback(() => {
    showToast(t('profile.deactivateDesc'));
  }, [showToast, t]);

  const handleNamePress = () => {
    if (!user) return;
    if (user.aadhaarVerified) {
      showToast(t('profile.nameNotEditable'));
      return;
    }
    setEditingBio(false);
    setNameDraft(user.name || '');
    setEditingName(true);
  };

  const handleBirthYearPress = () => {
    if (!user) return;
    if (user.aadhaarVerified) {
      showToast(t('profile.birthYearNotEditable'));
      return;
    }
    setActiveSelector('birthYear');
  };

  const handleGenderPress = () => {
    if (!user) return;
    if (user.aadhaarVerified) {
      showToast(t('profile.genderNotEditable'));
      return;
    }
    setActiveSelector('gender');
  };

  const openServicesEditor = () => {
    navigation.navigate('SPSelectServices', {
      mode: 'edit',
      initialSelected: services,
      onDone: async (selected: string[]) => {
        try {
          await updateUser({ services: selected });
          setProfileError(null);
          showToast(t('common.updatedDesc'));
        } catch (error) {
          setProfileError(error);
        }
      },
    });
  };

  const openLocationEditor = () => navigation.navigate('LocationSelect', { mode: 'edit' });

  const handleRatingPress = () => {
    showToast(ratingCount
      ? `${ratingAverage?.toFixed(1) ?? '0.0'} / 5 · ${t('profile.ratingCount', { count: ratingCount })}`
      : t('profile.noRatingsYet'));
  };

  const moreMenuOptions = [
    ...(user?.isModerator
      ? [{ label: t('profilePhotoModeration.openQueue'), value: 'moderation', icon: 'shield-checkmark-outline' as const }]
      : []),
    { label: t('profile.logout'), value: 'logout', icon: 'log-out-outline' as const },
    { label: t('profile.deactivateAccount'), value: 'deactivate', icon: 'trash-outline' as const },
    { label: t('common.cancel'), value: 'cancel', icon: 'close-outline' as const },
  ];

  const handleMoreSelect = (value: string) => {
    setIsMoreMenuVisible(false);
    if (value === 'logout') void handleLogout();
    else if (value === 'deactivate') handleDeactivate();
    else if (value === 'moderation') navigation.navigate('ProfileImageModeration');
  };

  if (!user) {
    // Session is still being restored — branded full-screen loading state.
    return (
      <View style={styles.bootLoading}>
        <AnimatedServiceIconLoader showBrand size={112} />
      </View>
    );
  }

  const photoNote = user.picModeration === 'under_review'
    ? t('profile.photoUnderReview')
    : user.picModeration === 'blocked'
      ? t('profile.photoBlocked')
      : '';

  return (
    <View style={styles.screen}>
      <Header
        title={t('profile.header')}
        showBackButton={true}
        showNotification={false}
        customRightComponent={
          <TouchableOpacity
            style={styles.headerMore}
            onPress={() => setIsMoreMenuVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('profile.moreOptions')}
          >
            <ProfileIcon name="more-vertical" size={21} color={C.ink} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: avatar, identity, Aadhaar status and verification CTA. */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setIsPhotoSourcePickerVisible(true)}
            disabled={isUploadingPhoto || Platform.OS === 'web'}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('profile.changePhotoTitle')}
            accessibilityHint={t('profile.tapToChangePhoto')}
          >
            <View style={styles.avatarShell}>
              {user.picUrl ? (
                <Image
                  source={{ uri: getOptimizedProfileImageUrl(user.picUrl) }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <ProfileAvatarPlaceholder size={86} />
              )}
            </View>
            {Platform.OS !== 'web' && (
              <View style={styles.cameraBtn} pointerEvents="none">
                <ProfileIcon name="camera" size={16} color={C.white} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.heroName} numberOfLines={2}>
            {user.name || t('profile.yourName')}
          </Text>
          <Text style={styles.heroSub}>
            {isProvider ? t('profile.subtitleServiceProvider') : t('profile.subtitleEndUser')}
          </Text>

          <View style={[styles.statusPill, user.aadhaarVerified && styles.statusPillVerified]}>
            <ProfileIcon
              name="shield"
              size={15}
              color={user.aadhaarVerified ? C.primaryDark : C.dangerInk}
            />
            <Text style={[styles.statusText, user.aadhaarVerified && styles.statusTextVerified]}>
              {user.aadhaarVerified ? t('profile.aadhaarVerified') : t('profile.aadhaarNotVerified')}
            </Text>
          </View>

          {!user.aadhaarVerified && (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={() => navigation.navigate('AadhaarKyc')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('profile.verifyAadhaar')}
            >
              <ProfileIcon name="fingerprint" size={20} color={C.white} />
              <Text style={styles.verifyBtnText}>{t('profile.verifyAadhaar')}</Text>
              <Text style={styles.verifyArrow}>→</Text>
            </TouchableOpacity>
          )}

          {Platform.OS !== 'web' && !!photoNote && (
            <Text style={styles.photoNote}>{photoNote}</Text>
          )}
        </View>

        {user.isModerator && (
          <ProfileCard style={styles.moderatorCard}>
            <ProfileInfoRow
              icon="shield"
              label={t('profilePhotoModeration.openQueue')}
              trailing="chevron"
              onPress={() => navigation.navigate('ProfileImageModeration')}
            />
          </ProfileCard>
        )}

        {/* Rating summary. */}
        <TouchableOpacity
          style={styles.summary}
          onPress={handleRatingPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('profile.yourRating')}
        >
          <View style={styles.summaryTile}>
            <ProfileIcon name="star" size={20} color={C.primaryDark} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.summaryLabel}>{t('profile.yourRating')}</Text>
            <Text style={styles.summaryValue}>
              {ratingCount
                ? `${ratingAverage?.toFixed(1) ?? '0.0'} / 5 · ${t('profile.ratingCount', { count: ratingCount })}`
                : t('profile.noRatingsYet')}
            </Text>
          </View>
          <ProfileIcon name="chevron-right" size={18} color={C.trail} />
        </TouchableOpacity>

        {/* Account information. */}
        <View style={styles.section}>
          <ProfileSectionHeading title={t('profile.accountInformation')} />
          <ProfileCard>
            <ProfileInfoRow
              icon="user"
              label={t('profile.name')}
              value={editingName ? undefined : (user.name || '')}
              valueNode={editingName ? (
                <TextInput
                  style={styles.inlineInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  placeholder={t('profile.yourName')}
                  placeholderTextColor={C.muted}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  accessibilityLabel={t('profile.yourName')}
                />
              ) : undefined}
              trailing={user.aadhaarVerified ? 'lock' : 'chevron'}
              trailingNode={editingName ? (
                <View style={styles.inlineActions}>
                  {savingField === 'name' ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => { setEditingName(false); setNameDraft(user.name || ''); }}
                        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.cancel')}
                      >
                        <Text style={styles.inlineCancel}>{t('common.cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveName}
                        disabled={!nameDraft.trim() || nameDraft.trim() === (user.name || '').trim()}
                        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={t('profile.saveInline')}
                      >
                        <Text
                          style={[
                            styles.inlineSave,
                            (!nameDraft.trim() || nameDraft.trim() === (user.name || '').trim())
                              && styles.inlineSaveDisabled,
                          ]}
                        >
                          {t('profile.saveInline')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : undefined}
              onPress={editingName ? undefined : handleNamePress}
              showDivider
              accessibilityHint={user.aadhaarVerified ? t('profile.nameNotEditable') : undefined}
            />

            <ProfileInfoRow
              icon="phone"
              label={t('profile.mobileNumber')}
              value={maskPhoneNumber(user.phoneNumber || user.phone)}
              trailing="lock"
              onPress={() => showToast(t('profile.phoneNotEditable'))}
              accessibilityHint={t('profile.phoneNotEditable')}
              showDivider
            />

            <ProfileInfoRow
              icon="globe"
              label={t('profile.languageLabel')}
              value={getLanguageDisplay(user.language || lang || 'en')}
              trailing="chevron"
              onPress={() => navigation.navigate('LanguageSelection', {
                preferred: user.language || lang,
                mode: 'edit',
              })}
              showDivider
            />

            <ProfileInfoRow
              icon="users"
              label={t('profile.howYouUse')}
              value={isProvider ? t('profile.howYouUseProvider') : t('profile.howYouUseEndUser')}
              trailing="chevron"
              onPress={() => navigation.navigate('RoleSelect', { mode: 'edit' })}
            />
          </ProfileCard>
        </View>

        {/* Services offered (service providers only). */}
        {isProvider && (
          <View style={styles.section}>
            <ProfileSectionHeading
              title={t('profile.servicesYouOffer')}
              actionLabel={t('profile.edit')}
              onAction={openServicesEditor}
            />
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={openServicesEditor}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${t('profile.yourServices')}, ${servicesCountLabel}`}
            >
              <View style={styles.serviceHead}>
                <View style={styles.serviceTile}>
                  <ProfileIcon name="briefcase" size={20} color={C.primaryDark} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.serviceTitle}>{t('profile.yourServices')}</Text>
                  <Text style={styles.serviceSub}>{servicesCountLabel}</Text>
                </View>
              </View>
              <View style={styles.chips}>
                {services.length > 0 ? services.map(serviceId => {
                  const name = serviceNameMap[serviceId] || formatServiceName(serviceId);
                  return (
                    <View key={serviceId} style={styles.chip}>
                      <ProfileIcon name={serviceIcon(name)} size={16} color="#176C4C" />
                      <Text style={styles.chipText} numberOfLines={1}>{name}</Text>
                    </View>
                  );
                }) : (
                  <Text style={styles.emptyText}>{t('profile.noServices')}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Service area (service providers only). */}
        {isProvider && (
          <View style={styles.section}>
            <ProfileSectionHeading title={t('profile.serviceArea')} icon="map-pin" />
            <View style={styles.statsRow}>
              <ProfileStatTile
                icon="map-pin"
                label={t('profile.location')}
                value={locationName || t('profile.noLocation')}
              />
              <ProfileStatTile
                icon="target"
                label={t('profile.radius')}
                value={`${radius} km`}
              />
            </View>
            <TouchableOpacity
              onPress={openLocationEditor}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.editServiceArea')}
              style={styles.sectionLink}
            >
              <Text style={styles.sectionLinkText}>{t('profile.editServiceArea')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Experience and personal details (service providers only). */}
        {isProvider && (
          <View style={styles.section}>
            <ProfileSectionHeading title={t('profile.experienceDetails')} />
            <ProfileCard>
              <ProfileInfoRow
                icon="calendar"
                label={t('profile.workSinceYear')}
                value={workSinceYear ? String(workSinceYear) : t('profile.selectYear')}
                trailing="chevron"
                onPress={() => setActiveSelector('workSinceYear')}
                showDivider
              />
              <ProfileInfoRow
                icon="calendar"
                label={t('profile.birthYear')}
                value={birthYear ? String(birthYear) : t('profile.selectYear')}
                trailing={user.aadhaarVerified ? 'lock' : 'chevron'}
                onPress={handleBirthYearPress}
                showDivider
              />
              <ProfileInfoRow
                icon="gender"
                label={t('profile.gender')}
                value={genderLabel || t('profile.genderPlaceholder')}
                trailing={user.aadhaarVerified ? 'lock' : 'chevron'}
                onPress={handleGenderPress}
                showDivider
              />
              <ProfileInfoRow
                icon="file-text"
                label={t('profile.aboutMe')}
                value={editingBio ? undefined : (bio || t('profile.addIntroduction'))}
                valueNode={editingBio ? (
                  <TextInput
                    style={[styles.inlineInput, styles.inlineInputMultiline]}
                    value={bioDraft}
                    onChangeText={setBioDraft}
                    autoFocus
                    multiline
                    placeholder={t('profile.aboutMePlaceholder')}
                    placeholderTextColor={C.muted}
                    accessibilityLabel={t('profile.aboutMe')}
                  />
                ) : undefined}
                trailing="chevron"
                trailingNode={editingBio ? (
                  <View style={styles.inlineActions}>
                    {savingField === 'bio' ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => { setEditingBio(false); setBioDraft(bio); }}
                          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={t('common.cancel')}
                        >
                          <Text style={styles.inlineCancel}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSaveBio}
                          disabled={bioDraft.trim() === bio.trim()}
                          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={t('profile.saveInline')}
                        >
                          <Text
                            style={[
                              styles.inlineSave,
                              bioDraft.trim() === bio.trim() && styles.inlineSaveDisabled,
                            ]}
                          >
                            {t('profile.saveInline')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : undefined}
                onPress={editingBio ? undefined : () => {
                  setEditingName(false);
                  setBioDraft(bio);
                  setEditingBio(true);
                }}
              />
            </ProfileCard>
          </View>
        )}

        {/* Preferences. */}
        <View style={styles.section}>
          <ProfileSectionHeading title={t('profile.preferences')} icon="settings" />
          <View style={styles.prefCard}>
            <View style={styles.prefIconTile}>
              <ProfileIcon name="moon" size={19} color={C.primaryDark} />
            </View>
            <View style={styles.grow}>
              <Text style={styles.prefTitle}>{t('profile.darkMode')}</Text>
              <Text style={styles.prefSub}>{t('profile.darkModeDesc')}</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#D8DFDB', true: C.primary }}
              thumbColor={C.white}
              ios_backgroundColor="#D8DFDB"
              accessibilityRole="switch"
              accessibilityLabel={t('profile.darkMode')}
              accessibilityState={{ checked: darkMode }}
            />
          </View>
        </View>

        {/* Professional plans. */}
        {isProvider && (
          <View style={styles.promoWrap}>
            <UpgradeProBanner
              variant="card"
              onPress={() => navigation.navigate('Subscription')}
            />
          </View>
        )}

        {/* Account actions. */}
        <View style={styles.actionsSection}>
          <ProfileActionRow
            icon="logout"
            label={t('profile.logout')}
            onPress={handleLogout}
            loading={isLoggingOut}
            tone="danger"
          />
          <ProfileActionRow
            icon="trash"
            label={t('profile.deactivateAccount')}
            onPress={handleDeactivate}
            tone="dangerFilled"
          />
          <BrandText style={styles.version}>{t('profile.appVersion')}</BrandText>
        </View>
      </ScrollView>

      <SingleSelectRadioModal
        visible={activeSelector !== null}
        title={activeSelection?.title ?? ''}
        options={activeSelection?.options ?? []}
        selectedValue={activeSelection?.value ?? ''}
        onSelect={handleSelectOption}
        onClose={() => setActiveSelector(null)}
      />

      <SingleSelectRadioModal
        visible={isPhotoSourcePickerVisible}
        title={t('profile.changePhotoTitle')}
        options={[
          { label: t('profile.takePhoto'), value: 'camera', icon: 'camera-outline' },
          { label: t('profile.chooseFromLibrary'), value: 'library', icon: 'images-outline' },
          { label: t('common.cancel'), value: 'cancel', icon: 'close-outline' },
        ]}
        selectedValue=""
        showRadio={false}
        onSelect={(source) => {
          setIsPhotoSourcePickerVisible(false);
          if (source === 'camera' || source === 'library') void chooseProfilePhoto(source);
        }}
        onClose={() => setIsPhotoSourcePickerVisible(false)}
      />

      <SingleSelectRadioModal
        visible={isMoreMenuVisible}
        title={t('profile.moreOptions')}
        options={moreMenuOptions}
        selectedValue=""
        showRadio={false}
        onSelect={handleMoreSelect}
        onClose={() => setIsMoreMenuVisible(false)}
      />

      <ErrorBanner error={profileError} onRetry={refreshUser} />
      {!isBottomTabsDisplayed && <SafeBottomBanner />}
      <BlockingLoader visible={isBlocking} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.page,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },

  headerMore: {
    marginLeft: 'auto',
    padding: 4,
  },

  /* ---------- hero ---------- */
  hero: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 17,
    backgroundColor: '#F2FBF6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6F4EC',
    borderRadius: 20,
    marginBottom: 14,
  },
  avatarWrap: {
    width: 94,
    height: 94,
    marginBottom: 10,
  },
  avatarShell: {
    width: 94,
    height: 94,
    borderRadius: 47,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: C.white,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A5133',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontFamily: F.bold,
    fontSize: 22,
    lineHeight: 27,
    color: C.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSub: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 15,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 11,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.dangerSoft,
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusPillVerified: {
    backgroundColor: C.primarySoft,
  },
  statusText: {
    fontFamily: F.semiBold,
    fontSize: 12,
    color: C.dangerInk,
  },
  statusTextVerified: {
    color: C.primaryDark,
  },
  verifyBtn: {
    width: '100%',
    minHeight: 48,
    marginTop: 13,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 14,
  },
  verifyBtnText: {
    fontFamily: F.bold,
    fontSize: 14,
    color: C.white,
    flexShrink: 1,
  },
  verifyArrow: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.white,
  },
  photoNote: {
    marginTop: 10,
    fontFamily: F.regular,
    fontSize: 11,
    lineHeight: 15,
    color: C.muted,
    textAlign: 'center',
  },

  /* ---------- moderator shortcut ---------- */
  moderatorCard: {
    marginBottom: 13,
  },

  /* ---------- rating summary ---------- */
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 15,
    padding: 12,
    marginTop: 0,
    marginBottom: 21,
    shadowColor: '#15251D',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryTile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryLabel: {
    fontFamily: F.semiBold,
    fontSize: 13,
    color: C.ink,
  },
  summaryValue: {
    marginTop: 3,
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 16,
    color: C.muted,
  },

  /* ---------- sections ---------- */
  section: {
    marginTop: 0,
    marginBottom: 21,
  },
  sectionLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  sectionLinkText: {
    fontFamily: F.semiBold,
    fontSize: 12,
    color: C.primary,
  },

  /* ---------- services card ---------- */
  serviceCard: {
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 15,
    padding: 13,
    shadowColor: '#15251D',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  serviceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  serviceTile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  serviceTitle: {
    fontFamily: F.semiBold,
    fontSize: 13,
    color: C.ink,
  },
  serviceSub: {
    marginTop: 3,
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 16,
    color: C.muted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primarySoft,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: {
    flexShrink: 1,
    fontFamily: F.semiBold,
    fontSize: 11,
    color: '#176C4C',
  },
  emptyText: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.muted,
  },

  /* ---------- service area ---------- */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  /* ---------- preferences ---------- */
  prefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 14,
    padding: 13,
  },
  prefIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.rowIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  prefTitle: {
    fontFamily: F.semiBold,
    fontSize: 13,
    color: C.ink,
  },
  prefSub: {
    marginTop: 3,
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 16,
    color: C.muted,
  },

  /* ---------- inline editors ---------- */
  inlineInput: {
    marginTop: 2,
    paddingVertical: 0,
    minHeight: 22,
    fontFamily: F.regular,
    fontSize: 13,
    color: C.ink,
  },
  inlineInputMultiline: {
    minHeight: 40,
    textAlignVertical: 'top',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  inlineCancel: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.muted,
  },
  inlineSave: {
    fontFamily: F.semiBold,
    fontSize: 12,
    color: C.primary,
  },
  inlineSaveDisabled: {
    color: C.trail,
  },

  /* ---------- promo + account actions ---------- */
  promoWrap: {
    marginTop: 0,
    marginBottom: 10,
  },
  actionsSection: {
    marginTop: 0,
  },
  bootLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },
  version: {
    marginTop: 0,
    paddingTop: 22,
    paddingBottom: 5,
    textAlign: 'center',
    fontFamily: F.regular,
    fontSize: 11,
    color: C.version,
  },
});

export default ProfileScreen;
