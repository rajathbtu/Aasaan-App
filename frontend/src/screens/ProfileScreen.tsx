import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView, Image, Switch, ActivityIndicator } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { colors, spacing, radius } from '../theme';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import { getServices } from '../api';
import SafeBottomBanner from '../components/SafeBottomBanner';
import UpgradeProBanner from '../components/UpgradeProBanner';
import BlockingLoader from '../components/BlockingLoader';
import ProfileField from '../components/ProfileField';
import SingleSelectRadioModal from '../components/SingleSelectRadioModal';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

type ProfileSelector = 'workSinceYear' | 'birthYear' | 'gender';

/**
 * Displays and allows editing of the authenticated user's profile.  Users
 * can update their name, switch roles between end user and service
 * provider, navigate to notifications and subscription screens and
 * logout.  Certain fields (phone number) are not editable once set.
 */
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser, logout, setLanguage: setGlobalLanguage, refreshUser } = useAuth();
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  const isBottomTabsDisplayed = useNavigationState(state => state.type === 'tab');

  // Shared services list to map ids -> display names
  type Service = { id: string; name: string; category: string; tags?: string[] };
  const [allServices, setAllServices] = useState<Service[] | null>(null);
  const [profileError, setProfileError] = useState<unknown | null>(null);
  const servicesCacheKey = user?.id ? offlineCacheKey('services', user.id) : null;

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
        // keep cache on failure
        setProfileError(error);
      }
    })();
  }, [servicesCacheKey]);

  const serviceNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (allServices || []).forEach(s => { map[s.id] = s.name; });
    return map;
  }, [allServices]);

  // Derive initial values from user
  const initialName = user?.name || '';
  const initialRole: 'endUser' | 'serviceProvider' = (user?.role as any) || 'endUser';
  const initialServices: string[] = Array.isArray(user?.serviceProviderInfo?.services)
    ? (user!.serviceProviderInfo!.services as string[])
    : [];
  const initialLocation = user?.serviceProviderInfo?.location || null;
  const initialRadius = (user?.serviceProviderInfo?.radius as number | undefined) ?? 5;
  const initialWorkSinceYear = user?.serviceProviderInfo?.workSinceYear ?? null;
  const initialBirthYear = user?.serviceProviderInfo?.birthYear ?? null;
  const initialGender = user?.serviceProviderInfo?.gender ?? null;
  const initialBio = user?.serviceProviderInfo?.bio || '';

  // Pending editable state (changed only on Save)
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [pendingRole, setPendingRole] = useState<'endUser' | 'serviceProvider'>(initialRole);
  const [pendingServices, setPendingServices] = useState<string[]>(initialServices);
  const [pendingLocation, setPendingLocation] = useState<any>(initialLocation);
  const [pendingRadius, setPendingRadius] = useState<number>(initialRadius);
  const [pendingWorkSinceYear, setPendingWorkSinceYear] = useState(initialWorkSinceYear ? String(initialWorkSinceYear) : '');
  const [pendingBirthYear, setPendingBirthYear] = useState(initialBirthYear ? String(initialBirthYear) : '');
  const [pendingGender, setPendingGender] = useState(initialGender || '');
  const [pendingBio, setPendingBio] = useState(initialBio);
  const [editingBio, setEditingBio] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [activeSelector, setActiveSelector] = useState<ProfileSelector | null>(null);

  useEffect(() => {
    // If user object updates (after save), sync pending state
    if (!user) return;
    setEditing(false);
    setName(user.name || '');
    setPendingRole(user.role);
    setPendingServices(Array.isArray(user?.serviceProviderInfo?.services) ? (user!.serviceProviderInfo!.services as string[]) : []);
    setPendingLocation(user?.serviceProviderInfo?.location || null);
    setPendingRadius((user?.serviceProviderInfo?.radius as number | undefined) ?? 5);
    setPendingWorkSinceYear(user?.serviceProviderInfo?.workSinceYear ? String(user.serviceProviderInfo.workSinceYear) : '');
    setPendingBirthYear(user?.serviceProviderInfo?.birthYear ? String(user.serviceProviderInfo.birthYear) : '');
    setPendingGender(user?.serviceProviderInfo?.gender || '');
    setPendingBio(user?.serviceProviderInfo?.bio || '');
    setEditingBio(false);
  }, [user]);

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

  if (!user) {
    return (
      <BlockingLoader visible={true} />
    );
  }

  const deepEqualArray = (a: any[], b: any[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  const locationEqual = (a: any, b: any) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.name === b.name && a.lat === b.lat && a.lng === b.lng && a.placeId === b.placeId;
  };

  const canSave = useMemo(() => {
    const nameChanged = editing && name.trim() !== initialName.trim();
    const roleChanged = pendingRole !== initialRole;
    const servicesChanged = !deepEqualArray(pendingServices, initialServices);
    const radiusChanged = pendingRadius !== initialRadius;
    const locationChanged = !locationEqual(pendingLocation, initialLocation);
    const workSinceYearChanged = pendingWorkSinceYear !== (initialWorkSinceYear ? String(initialWorkSinceYear) : '');
    const birthYearChanged = pendingBirthYear !== (initialBirthYear ? String(initialBirthYear) : '');
    const genderChanged = pendingGender !== (initialGender || '');
    const bioChanged = pendingBio.trim() !== initialBio.trim();
    return nameChanged || roleChanged || servicesChanged || radiusChanged || locationChanged || workSinceYearChanged || birthYearChanged || genderChanged || bioChanged;
  }, [editing, name, pendingRole, pendingServices, pendingRadius, pendingLocation, pendingWorkSinceYear, pendingBirthYear, pendingGender, pendingBio, initialName, initialRole, initialServices, initialRadius, initialLocation, initialWorkSinceYear, initialBirthYear, initialGender, initialBio]);

  const onSave = async () => {
    if (!canSave) return;
    const updates: any = {};
    if (editing && name.trim() !== initialName.trim()) updates.name = name.trim();
    if (pendingRole !== initialRole) updates.role = pendingRole;
    if (!deepEqualArray(pendingServices, initialServices)) updates.services = pendingServices;
    if (pendingRadius !== initialRadius) updates.radius = pendingRadius;
    if (pendingWorkSinceYear !== (initialWorkSinceYear ? String(initialWorkSinceYear) : '')) {
      updates.workSinceYear = pendingWorkSinceYear.trim() ? Number(pendingWorkSinceYear) : null;
    }
    if (pendingBirthYear !== (initialBirthYear ? String(initialBirthYear) : '')) {
      updates.birthYear = pendingBirthYear.trim() ? Number(pendingBirthYear) : null;
    }
    if (pendingGender !== (initialGender || '')) updates.gender = pendingGender || null;
    if (pendingBio.trim() !== initialBio.trim()) updates.bio = pendingBio.trim() || null;
    if (!locationEqual(pendingLocation, initialLocation)) updates.location = pendingLocation ? {
      name: pendingLocation.name,
      lat: pendingLocation.lat,
      lng: pendingLocation.lng,
      placeId: pendingLocation.place_id || pendingLocation.placeId,
    } : null;

    setIsSavingName(true);
    try {
      await updateUser(updates);
      setProfileError(null);
      setEditing(false);
      setEditingBio(false);
      showToast(t('common.updatedDesc'));
    } catch (err: any) {
      setProfileError(err);
    } finally {
      setIsSavingName(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const workSinceYears = Array.from({ length: currentYear - 1949 }, (_, index) => String(currentYear - index));
  const latestEligibleBirthYear = currentYear - 14; // allow minimum age of 14 for service providers
  const birthYears = Array.from({ length: latestEligibleBirthYear - 1945 + 1 }, (_, index) => String(latestEligibleBirthYear - index));
  const selectorConfig: Record<ProfileSelector, {
    title: string; options: { label: string; value: string }[]; value: string;
    onSelect: (value: string) => void;
  }> = {
    workSinceYear: {
      title: t('profile.workSinceYear'),
      options: [...workSinceYears.map(year => ({ label: year, value: year }))],
      value: pendingWorkSinceYear,
      onSelect: setPendingWorkSinceYear,
    },
    birthYear: {
      title: t('profile.birthYear'),
      options: [...birthYears.map(year => ({ label: year, value: year }))],
      value: pendingBirthYear,
      onSelect: setPendingBirthYear,
    },
    gender: {
      title: t('profile.gender'),
      options: [{ label: t('profile.genderMale'), value: 'male' },
      { label: t('profile.genderFemale'), value: 'female' }],
      value: pendingGender,
      onSelect: setPendingGender,
    },
  };
  const activeSelection = activeSelector ? selectorConfig[activeSelector] : null;
  const ratingCount = user.userRating?.count ?? 0;

  const selectOption = (value: string) => {
    activeSelection?.onSelect(value);
    setActiveSelector(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Header title={t('profile.header')} showBackButton={true} showNotification={false} />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Profile photo */}
        <View style={styles.photoSection}>
          <View style={{ position: 'relative', marginBottom: spacing.xs }}>
            <View style={styles.avatarShell}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={pendingGender === 'male' ? 'man' : pendingGender === 'female' ? 'woman' : 'person'}
                    size={56} color={colors.greyMuted} />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={async () => {
                Alert.prompt?.(t('profile.changePhotoTitle'), t('profile.changePhotoDesc'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.save'), onPress: async (value?: string) => { if (!value) return; try { await updateUser({ avatarUrl: value }); setProfileError(null); } catch (error) { setProfileError(error); } } },
                ], 'plain-text');
              }}
            >
              <Ionicons name="camera" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.photoNote}>{t('profile.tapToChangePhoto')}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.ratingSummary}>
            <Text style={styles.ratingSummaryTitle}>{t('profile.yourRating')}</Text>
            <View style={styles.ratingValue}>
              <Ionicons name="star" size={17} color={colors.secondary} />
              <Text style={styles.ratingAverage}>
                {ratingCount ? `${user.userRating?.average?.toFixed(1) ?? '0.0'} / 5` : '—'}
              </Text>
              <Text style={styles.ratingCount}>
                {ratingCount ? t('profile.ratingCount', { count: ratingCount }) : t('profile.noRatingsYet')}
              </Text>
            </View>
          </View>
        </View>

        {/* Full Name */}
        <ProfileField
          title={t('profile.yourName')}
          titleIcon="person"
          fieldType="textfield"
          value={name}
          editing={editing}
          onChangeText={setName}
          placeholder={t('profile.yourName')}
          onPress={() => { setEditing(true); setEditingBio(false); }}
          fieldEditIcon={'pencil'}
          trailingContent={canSave ? (
            <TouchableOpacity onPress={onSave} style={styles.inlineSaveBtn} activeOpacity={0.8} disabled={isSavingName}>
              {isSavingName && <ActivityIndicator size="small" color={colors.white} />}
              <Text style={styles.inlineSaveBtnText}>{t('common.saveChanges')}</Text>
            </TouchableOpacity>
          ) : undefined}/>

        {/* Mobile Number */}
        <ProfileField
          title={t('profile.mobileNumber')}
          titleIcon="call"
          fieldType="textfield"
          value={user?.phoneNumber || user?.phone || ''}
          fieldEditIcon="lock-closed"
          onPress={() => showToast(t('profile.phoneNotEditable'))}/>

        {/* Language */}
        <ProfileField
          title={t('profile.languageLabel')}
          titleIcon="globe"
          fieldType="textfield"
          value={getLanguageDisplay(user?.language || lang || 'en')}
          fieldEditIcon="pencil"
          onPress={() =>
            navigation.navigate('LanguageSelection', {
              preferred: user?.language || lang,
              mode: 'edit',
            })} />

        {/* User Role */}
        <ProfileField
          title={t('roleSelect.title')}
          titleIcon="people"
          fieldType="textfield"
          value={pendingRole === 'serviceProvider' ? t('profile.roleServiceProvider') : t('profile.roleEndUser')}
          fieldEditIcon="pencil"
          onPress={() => navigation.navigate('RoleSelect', { mode: 'edit' })} />

        {/* Service Provider Information */}
        {pendingRole === 'serviceProvider' && (
          <View style={styles.section}>
            <ProfileField
              title={t('sp.selectServices.title')}
              titleIcon="briefcase"
              fieldType="custom"
              fieldEditIcon="pencil"
              containerStyle={styles.providerProfileField}
              onPress={() =>
                navigation.navigate('SPSelectServices', {
                  mode: 'edit',
                  initialSelected: pendingServices,
                  onDone: async (sel: string[]) => {
                    setPendingServices(sel);
                    setIsUpdating(true);
                    try {
                      await updateUser({ services: sel });
                      setProfileError(null);
                      showToast(t('common.updatedDesc'));
                    } catch (error) {
                      setProfileError(error);
                    } finally {
                      setIsUpdating(false);
                    }
                  },
                })
              }>
              <View style={styles.profileFieldContent}>
                <View style={styles.servicesChipsRow}>
                  {pendingServices.length > 0 ? (
                    pendingServices.map((svc: string) => (
                      <View key={svc} style={styles.serviceChipPrimary}>
                        <Text style={styles.serviceChipTextWhite}>{serviceNameMap[svc] || svc}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.grey }}>{t('profile.noServices')}</Text>
                  )}
                </View>
              </View>
            </ProfileField>

            <ProfileField
              title={t('profile.serviceLocation')}
              titleIcon="location"
              fieldType="custom"
              fieldEditIcon="pencil"
              containerStyle={styles.providerProfileField}
              onPress={() => navigation.navigate('LocationSelect', { mode: 'edit' })}>
              <View style={styles.profileFieldContent}>
                <Text style={styles.locationSummaryText} numberOfLines={2}>
                  {pendingLocation?.name || pendingLocation?.description || t('profile.noLocation') || 'No location selected'}
                </Text>
                <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t('profile.serviceRadius')}</Text>
                <Text style={styles.locationSummaryText}>{pendingRadius} km</Text>
              </View>
            </ProfileField>

            <ProfileField
              title={t('profile.workSinceYear')}
              titleIcon="calendar"
              fieldType="textfield"
              value={pendingWorkSinceYear || t('profile.workSinceYearPlaceholder')}
              fieldEditIcon="pencil"
              containerStyle={styles.providerProfileField}
              onPress={() => setActiveSelector('workSinceYear')}/>

            <ProfileField
              title={t('profile.birthYear')}
              titleIcon="calendar-outline"
              fieldType="textfield"
              value={pendingBirthYear || t('profile.birthYearPlaceholder')}
              fieldEditIcon="pencil"
              containerStyle={styles.providerProfileField}
              onPress={() => setActiveSelector('birthYear')}/>

            <ProfileField
              title={t('profile.gender')}
              titleIcon="person-outline"
              fieldType="textfield"
              value={pendingGender === 'male'
                ? t('profile.genderMale')
                : pendingGender === 'female' ? t('profile.genderFemale') : t('profile.genderPlaceholder')}
              fieldEditIcon="pencil"
              containerStyle={styles.providerProfileField}
              onPress={() => setActiveSelector('gender')}/>

            <ProfileField
              title={t('profile.aboutMe')}
              titleIcon="document-text-outline"
              fieldType="textfield"
              value={pendingBio}
              editing={editingBio}
              onPress={() => setEditingBio(true)}
              onChangeText={setPendingBio}
              placeholder={t('profile.aboutMePlaceholder')}
              fieldEditIcon="pencil"
              containerStyle={styles.providerProfileField}/>

          </View>
        )}

        {/* Additional Settings */}
        <ProfileField
          title={t('profile.additionalSettings')}
          titleIcon="settings"
          fieldType="custom"
          onPress={() => showToast('This feature is not supported for your device')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="moon" size={16} color={colors.grey} style={{ marginRight: spacing.sm }} />
              <Text style={{ fontSize: 14, color: colors.dark }}>{t('profile.darkMode')}</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} thumbColor={darkMode ? colors.primary : colors.white} trackColor={{ true: colors.primaryBorder, false: colors.greyLight }} />
        </ProfileField>

        {/* Professional Plans Promotion */}
        {user.role === 'serviceProvider' && (
          <View style={styles.section}>
            <UpgradeProBanner
              variant="card"
              onPress={() => navigation.navigate('Subscription')}/>
          </View>
        )}

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity onPress={async () => {
              setIsUpdating(true);
              try {
                await logout();
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating} style={styles.logoutRow}>
            <Ionicons name="log-out" size={16} color={colors.error} style={{ marginRight: spacing.xs }} />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => showToast(t('profile.deactivateDesc'))} style={styles.logoutRow}>
            <Ionicons name="alert-circle" size={16} color={colors.error} style={{ marginRight: spacing.xs }} />
            <Text style={styles.logoutText}>{t('profile.deactivate')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version 1.2.0</Text>
      </ScrollView>

      <SingleSelectRadioModal
        visible={activeSelector !== null}
        title={activeSelection?.title ?? ''}
        options={activeSelection?.options ?? []}
        selectedValue={activeSelection?.value ?? ''}
        onSelect={selectOption}
        onClose={() => setActiveSelector(null)}/>

      <ErrorBanner error={profileError} onRetry={refreshUser} />
      {!isBottomTabsDisplayed && <SafeBottomBanner />}
      <BlockingLoader visible={isUpdating} />
    </View>
  );
};

const styles = StyleSheet.create({
  photoSection: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  avatarShell: {
    height: 96,
    width: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: colors.greyLight,
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 999,
    padding: 8,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  photoNote: {
    fontSize: 12,
    color: colors.grey,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  providerProfileField: {
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  ratingSummary: {
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingSummaryTitle: {
    color: colors.dark,
    fontSize: 15,
    fontWeight: '700',
  },
  ratingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingAverage: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: '700',
  },
  ratingCount: {
    color: colors.grey,
    fontSize: 12,
  },
  profileFieldContent: {
    flex: 1,
    backgroundColor: colors.greyLight,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grey,
    marginBottom: spacing.xs,
  },
  inlineSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSaveBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  servicesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  serviceChipPrimary: {
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: 10,
    margin: spacing.xs,
  },
  serviceChipTextWhite: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: '600',
  },
  locationSummaryText: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.greyMuted,
    marginVertical: spacing.lg,
  },
});

export default ProfileScreen;