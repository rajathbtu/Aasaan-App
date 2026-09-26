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
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';

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

  // Pending editable state (changed only on Save)
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [pendingRole, setPendingRole] = useState<'endUser' | 'serviceProvider'>(initialRole);
  const [pendingServices, setPendingServices] = useState<string[]>(initialServices);
  const [pendingLocation, setPendingLocation] = useState<any>(initialLocation);
  const [pendingRadius, setPendingRadius] = useState<number>(initialRadius);
  const [darkMode, setDarkMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    // If user object updates (after save), sync pending state
    if (!user) return;
    setEditing(false);
    setName(user.name || '');
    setPendingRole(user.role);
    setPendingServices(Array.isArray(user?.serviceProviderInfo?.services) ? (user!.serviceProviderInfo!.services as string[]) : []);
    setPendingLocation(user?.serviceProviderInfo?.location || null);
    setPendingRadius((user?.serviceProviderInfo?.radius as number | undefined) ?? 5);
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
    return nameChanged || roleChanged || servicesChanged || radiusChanged || locationChanged;
  }, [editing, name, pendingRole, pendingServices, pendingRadius, pendingLocation, initialName, initialRole, initialServices, initialRadius, initialLocation]);

  const onSave = async () => {
    if (!canSave) return;
    const updates: any = {};
    if (editing && name.trim() !== initialName.trim()) updates.name = name.trim();
    if (pendingRole !== initialRole) updates.role = pendingRole;
    if (!deepEqualArray(pendingServices, initialServices)) updates.services = pendingServices;
    if (pendingRadius !== initialRadius) updates.radius = pendingRadius;
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
      showToast(t('common.updatedDesc'));
    } catch (err: any) {
      setProfileError(err);
    } finally {
      setIsSavingName(false);
    }
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
                  <Ionicons name="person" size={56} color={colors.greyMuted} />
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

        {/* Full Name */}
        <ProfileField
          title={t('profile.yourName')}
          titleIcon="person"
          fieldType="textfield"
          value={name}
          editing={editing}
          onChangeText={setName}
          placeholder={t('profile.yourName')}
          onPress={() => setEditing(true)}
          fieldEditIcon={'pencil'}
          trailingContent={editing && name.trim() !== initialName.trim() ? (
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
              }
            >
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