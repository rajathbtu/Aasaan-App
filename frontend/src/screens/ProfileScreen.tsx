import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView, Image, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';
import LocationSearch from '../components/LocationSearch';
import { useI18n } from '../i18n';
import { getLanguageDisplay } from '../data/languages';
import Header from '../components/Header';

/**
 * Displays and allows editing of the authenticated user's profile.  Users
 * can update their name, switch roles between end user and service
 * provider, navigate to notifications and subscription screens and
 * logout.  Certain fields (phone number) are not editable once set.
 */
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser, logout, setLanguage: setGlobalLanguage } = useAuth();
  const { t, lang } = useI18n();

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

  useEffect(() => {
    // If user object updates (after save), sync pending state
    if (!user) return;
    setEditing(false);
    setName(user.name || '');
    setPendingRole(user.role);
    setPendingServices(Array.isArray(user?.serviceProviderInfo?.services) ? (user!.serviceProviderInfo!.services as string[]) : []);
    setPendingLocation(user?.serviceProviderInfo?.location || null);
    setPendingRadius((user?.serviceProviderInfo?.radius as number | undefined) ?? 5);
  }, [user?.id, user?.name, user?.role]);

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{ color: colors.dark }}>Loading...</Text>
      </SafeAreaView>
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

    try {
      await updateUser(updates);
      setEditing(false);
      Alert.alert(t('common.updated'), t('common.updatedDesc'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to save changes');
    }
  };

  const canGoBack = navigation.canGoBack?.() ?? false;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Header title={t('profile.header')} showBackButton={false} showNotification={false} 
        customRightComponent={
            <TouchableOpacity onPress={onSave} disabled={!canSave} style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}>
              <Text style={styles.saveBtnText}>{t('common.saveChanges')}</Text>
            </TouchableOpacity>
        }
      />
      <View style={{ height: spacing.sm }} />
      <ScrollView style={{ flex: 1 }}>
        {/* Profile photo */}
        <View style={styles.photoSection}>
          <View style={{ position: 'relative', marginBottom: spacing.xs }}>
            <View style={styles.avatarShell}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={56} color={'#9ca3af'} />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={async () => {
                Alert.prompt?.(t('profile.changePhotoTitle'), t('profile.changePhotoDesc'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.save'), onPress: async (value?: string) => { if (!value) return; try { await updateUser({ avatarUrl: value }); } catch (e:any) { Alert.alert(t('common.error'), e.message || 'Failed to update photo'); } } },
                ], 'plain-text');
              }}
            >
              <Ionicons name="camera" size={14} color={'#fff'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.photoNote}>{t('profile.tapToChangePhoto')}</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>

          {/* Full Name */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.fieldLabel}>{t('profile.yourName')}</Text>
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.infoCell} activeOpacity={1}>
              {editing ? (
                <TextInput
                  style={styles.inputInCell}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('profile.yourName')}
                  placeholderTextColor={'#9ca3af'}
                />
              ) : (
                <Text style={styles.infoValue}>{user.name}</Text>
              )}
              <Ionicons name="pencil" size={14} color={editing ? colors.primary : '#9ca3af'} />
            </TouchableOpacity>
          </View>

          {/* Mobile Number */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.fieldLabel}>{t('profile.mobileNumber')}</Text>
            <TouchableOpacity onPress={() => Alert.alert(t('common.notEditable'), t('profile.phoneNotEditable'))} style={styles.infoCell} activeOpacity={1}>
              <Text style={styles.infoValue}>{user?.phoneNumber || user?.phone || ''}</Text>
              <Ionicons name="pencil" size={14} color={'#9ca3af'} />
            </TouchableOpacity>
          </View>

          {/* Language */}
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={styles.fieldLabel}>{t('profile.languageLabel')}</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('LanguageSelection', {
                    preferred: user?.language || lang,
                  })
                }
              style={styles.infoCell}
              activeOpacity={1}
            >
              <Text style={styles.infoValue}>{getLanguageDisplay(user?.language || lang || 'en')}</Text>
              <Ionicons name="pencil" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Role */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.userRole')}</Text>
          <View style={styles.roleGrid}>
            <TouchableOpacity
              style={[styles.roleCard, pendingRole === 'endUser' ? styles.roleCardSelected : styles.roleCardUnselected]}
              onPress={() => setPendingRole('endUser')}
            >
              <View style={[styles.roleIconCircle, pendingRole === 'endUser' ? { backgroundColor: colors.primary } : { backgroundColor: '#e5e7eb' }]}>
                <Ionicons name="search" size={18} color={pendingRole === 'endUser' ? '#fff' : '#6b7280'} />
              </View>
              <Text style={[styles.roleText, pendingRole === 'endUser' ? { color: colors.primary } : { color: '#6b7280' }]}>{t('profile.roleEndUser')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleCard, pendingRole === 'serviceProvider' ? styles.roleCardSelected : styles.roleCardUnselected]}
              onPress={() => setPendingRole('serviceProvider')}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: '#e5e7eb' }]}>
                <Ionicons name="briefcase" size={18} color={'#6b7280'} />
              </View>
              <Text style={[styles.roleText, { color: '#6b7280' }]}>{t('profile.roleServiceProvider')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Provider Information */}
        {pendingRole === 'serviceProvider' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.spInfo')}</Text>

            {/* Services Offered */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.fieldLabel}>{t('profile.servicesOffered')}</Text>
              <View style={styles.servicesBox}>
                <View style={styles.servicesChipsRow}>
                  {pendingServices && pendingServices.length > 0 ? (
                    pendingServices.map((svc: string) => (
                      <View key={svc} style={styles.serviceChipPrimary}>
                        <Text style={styles.serviceChipTextWhite}>{svc}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{t('profile.noServices')}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('SPSelectServices', {
                      mode: 'edit',
                      initialSelected: pendingServices,
                      onDone: (sel: string[]) => setPendingServices(sel),
                    })
                  }
                  style={styles.addServiceFullButton}
                >
                  <Ionicons name="add" size={16} color={'#fff'} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.addServiceFullText}>{t('profile.addService')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Service Location */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.fieldLabel}>{t('profile.serviceLocation')}</Text>
              <LocationSearch
                    onSelect={(loc) => setPendingLocation({ name: loc.description || loc.name, place_id: loc.place_id || loc.placeId, lat: loc.lat, lng: loc.lng })}
                    initialValue={pendingLocation?.name || ''}
                  />
            </View>

            {/* Service Radius */}
            <View style={{ marginBottom: spacing.xs }}>
              <Text style={styles.fieldLabel}>{t('profile.serviceRadius')}</Text>
              <View style={styles.radiusGrid}>
                {[5, 10, 15, 20].map(r => {
                  const selected = pendingRadius === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.radiusCell, selected ? styles.radiusCellSelected : styles.radiusCellUnselected]}
                      onPress={() => setPendingRadius(r)}
                    >
                      <Text style={[styles.radiusCellText, selected ? { color: colors.primary, fontWeight: '700' } : { color: '#6b7280' }]}>
                        {r} km
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Additional Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.additionalSettings')}</Text>
          <View style={styles.settingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="moon" size={16} color={'#6b7280'} style={{ marginRight: spacing.sm }} />
              <Text style={{ fontSize: 14, color: colors.dark }}>{t('profile.darkMode')}</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} thumbColor={darkMode ? colors.primary : '#fff'} trackColor={{ true: '#bfdbfe', false: '#e5e7eb' }} />
          </View>
        </View>

        {/* Professional Plans Promotion */}
        <View style={styles.section}>
          <View style={styles.proCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <View style={styles.proIconCircle}>
                <Ionicons name="trophy" size={16} color={'#fff'} />
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={styles.proTitle}>{t('profile.upgradeTitle')}</Text>
                <Text style={styles.proSubtitle}>{t('profile.upgradeSubtitle')}</Text>
              </View>
            </View>

            <View style={{ marginBottom: spacing.sm }}>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>{t('profile.featEarly')}</Text>
              </View>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>{t('profile.featMultiLoc')}</Text>
              </View>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>{t('profile.featRadius')}</Text>
              </View>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>{t('profile.featPriority')}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.proPrice}>{t('profile.startingFrom', { price: '₹100' })}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Subscription')} style={styles.proBtn}>
                <Text style={styles.proBtnText}>{t('profile.viewPlans')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity onPress={logout} style={styles.logoutRow}>
            <Ionicons name="log-out" size={16} color={colors.error} style={{ marginRight: spacing.xs }} />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Deactivate', t('profile.deactivateDesc'))} style={styles.logoutRow}>
            <Ionicons name="alert-circle" size={16} color={colors.error} style={{ marginRight: spacing.xs }} />
            <Text style={styles.logoutText}>{t('profile.deactivate')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version 1.2.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
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
    backgroundColor: '#e5e7eb',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
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
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  photoNote: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: spacing.xs,
  },
  infoCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  inputInCell: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    paddingVertical: 0,
    marginRight: spacing.sm,
  },
  infoValue: {
    color: '#111827',
    fontSize: 14,
    flex: 1,
    marginRight: spacing.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  roleCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  roleCardUnselected: {
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  roleIconCircle: {
    borderRadius: 999,
    padding: 8,
    marginBottom: spacing.xs,
  },
  roleText: {
    fontSize: 12,
    textAlign: 'center',
  },
  servicesBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.md,
    backgroundColor: '#f9fafb',
    padding: spacing.md,
  },
  servicesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  serviceChipPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  serviceChipTextWhite: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addServiceFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addServiceFullText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  radiusGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radiusCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    borderWidth: 2,
  },
  radiusCellSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  radiusCellUnselected: {
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  radiusCellText: {
    fontSize: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  proCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  proIconCircle: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    padding: spacing.xs,
  },
  proTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  proSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  proFeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  proFeatText: {
    fontSize: 12,
    color: '#374151',
  },
  proPrice: {
    fontSize: 12,
    color: '#6b7280',
  },
  proBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  proBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#9ca3af',
    marginVertical: spacing.lg,
  },
  headerActionRow: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});

export default ProfileScreen;