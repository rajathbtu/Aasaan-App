import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Image,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius } from '../theme';

/**
 * Displays and allows editing of the authenticated user's profile.  Users
 * can update their name, switch roles between end user and service
 * provider, navigate to notifications and subscription screens and
 * logout.  Certain fields (phone number) are not editable once set.
 */
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const phone = user?.phoneNumber || user?.phone || '';
  const language = user?.language || 'English';
  const services: string[] = Array.isArray(user?.serviceProviderInfo?.services)
    ? (user!.serviceProviderInfo!.services as string[])
    : [];
  const serviceLocation = user?.serviceProviderInfo?.location?.name || '';
  const radiusValue = (user?.serviceProviderInfo?.radius as number | undefined) ?? 5;

  const canSave = useMemo(() => editing && name.trim().length > 0 && name.trim() !== (user?.name || ''), [editing, name, user?.name]);

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{ color: colors.dark }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const onSave = async () => {
    if (!editing) return; // Only saves name edits
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a valid name');
      return;
    }
    try {
      await updateUser({ name: trimmed });
      setEditing(false);
      Alert.alert('Updated', 'Changes saved');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save changes');
    }
  };

  const toggleRole = async (role: 'endUser' | 'serviceProvider') => {
    if (role === user.role) return;
    try {
      await updateUser({ role });
      if (role === 'serviceProvider') {
        navigation.navigate('SPSelectServices');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to switch role');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.light }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl + 80 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={'#6b7280'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <TouchableOpacity
            onPress={onSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
          >
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

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
                // Simple URL prompt substitute for mobile: suggest pasting an image URL
                Alert.prompt?.('Change Photo', 'Paste an image URL to use as your profile photo', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Save', onPress: async (value?: string) => { if (!value) return; try { await updateUser({ avatarUrl: value }); } catch (e:any) { Alert.alert('Error', e.message || 'Failed to update photo'); } } },
                ], 'plain-text');
              }}
            >
              <Ionicons name="camera" size={14} color={'#fff'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.photoNote}>Tap to change profile photo</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          {/* Full Name */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.infoCell}>
              {editing ? (
                <TextInput
                  style={styles.inputInCell}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={'#9ca3af'}
                />
              ) : (
                <Text style={styles.infoValue}>{user.name}</Text>
              )}
              <TouchableOpacity onPress={() => setEditing(!editing)}>
                <Ionicons name="pencil" size={14} color={editing ? colors.primary : '#9ca3af'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mobile Number */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <View style={styles.infoCell}>
              <Text style={styles.infoValue}>{phone}</Text>
              <TouchableOpacity onPress={() => Alert.alert('Not editable', 'Mobile number cannot be changed')}>
                <Ionicons name="pencil" size={14} color={'#9ca3af'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Language */}
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={styles.fieldLabel}>Language</Text>
            <View style={styles.infoCell}>
              <Text style={styles.infoValue}>{language}</Text>
              <TouchableOpacity onPress={() => Alert.alert('Not editable', 'Language cannot be changed in this demo')}>
                <Ionicons name="pencil" size={14} color={'#9ca3af'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* User Role */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Role</Text>
          <View style={styles.roleGrid}>
            <TouchableOpacity
              style={[styles.roleCard, user.role === 'endUser' ? styles.roleCardSelected : styles.roleCardUnselected]}
              onPress={() => toggleRole('endUser')}
            >
              <View style={[styles.roleIconCircle, user.role === 'endUser' ? { backgroundColor: colors.primary } : { backgroundColor: '#e5e7eb' }]}>
                <Ionicons name="search" size={18} color={user.role === 'endUser' ? '#fff' : '#6b7280'} />
              </View>
              <Text style={[styles.roleText, user.role === 'endUser' ? { color: colors.primary } : { color: '#6b7280' }]}>Find people to get work done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleCard, user.role === 'serviceProvider' ? styles.roleCardSelected : styles.roleCardUnselected]}
              onPress={() => toggleRole('serviceProvider')}
            >
              <View style={[styles.roleIconCircle, user.role === 'serviceProvider' ? { backgroundColor: '#e5e7eb' } : { backgroundColor: '#e5e7eb' }]}>
                <Ionicons name="briefcase" size={18} color={user.role === 'serviceProvider' ? '#6b7280' : '#6b7280'} />
              </View>
              <Text style={[styles.roleText, user.role === 'serviceProvider' ? { color: '#6b7280' } : { color: '#6b7280' }]}>Find work opportunities</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Provider Information */}
        {user.role === 'serviceProvider' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Provider Information</Text>

            {/* Services Offered */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.fieldLabel}>Services Offered</Text>
              <View style={styles.servicesBox}>
                <View style={styles.servicesChipsRow}>
                  {services && services.length > 0 ? (
                    services.map((svc: string) => (
                      <View key={svc} style={styles.serviceChipPrimary}>
                        <Text style={styles.serviceChipTextWhite}>{svc}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>No services selected</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('SPSelectServices')} style={styles.addServiceFullButton}>
                  <Ionicons name="add" size={16} color={'#fff'} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.addServiceFullText}>Add Service</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Service Location */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.fieldLabel}>Service Location</Text>
              <View style={styles.infoCell}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="location" size={14} color={'#9ca3af'} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.infoValue}>{serviceLocation || 'Select location'}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('SPSelectLocation')}>
                  <Ionicons name="pencil" size={14} color={'#9ca3af'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Service Radius */}
            <View style={{ marginBottom: spacing.xs }}>
              <Text style={styles.fieldLabel}>Service Radius</Text>
              <View style={styles.radiusGrid}>
                {[5, 10, 15, 20].map(r => {
                  const selected = radiusValue === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.radiusCell, selected ? styles.radiusCellSelected : styles.radiusCellUnselected]}
                      onPress={() => updateUser({ radius: r })}
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
          <Text style={styles.sectionTitle}>Additional Settings</Text>
          <View style={styles.settingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="moon" size={16} color={'#6b7280'} style={{ marginRight: spacing.sm }} />
              <Text style={{ fontSize: 14, color: colors.dark }}>Dark Mode</Text>
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
                <Text style={styles.proTitle}>Upgrade to Professional</Text>
                <Text style={styles.proSubtitle}>Get more work opportunities</Text>
              </View>
            </View>

            <View style={{ marginBottom: spacing.sm }}>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>Early notifications for new work requests</Text>
              </View>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>Multiple service locations (up to 5)</Text>
              </View>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>Increased service radius</Text>
              </View>
              <View style={styles.proFeatRow}>
                <Ionicons name="checkmark" size={12} color={colors.secondary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.proFeatText}>Priority listing for end users</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.proPrice}>Starting from <Text style={{ color: colors.primary, fontWeight: '700' }}>₹100/month</Text></Text>
              <TouchableOpacity onPress={() => navigation.navigate('Subscription')} style={styles.proBtn}>
                <Text style={styles.proBtnText}>View Plans</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity onPress={logout} style={styles.logoutRow}>
            <Ionicons name="log-out" size={16} color={colors.error} style={{ marginRight: spacing.xs }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Deactivate', 'Account deactivation is not available in this demo')} style={styles.logoutRow}>
            <Ionicons name="alert-circle" size={16} color={colors.error} style={{ marginRight: spacing.xs }} />
            <Text style={styles.logoutText}>Deactivate Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version 1.2.0</Text>
      </ScrollView>
    </SafeAreaView>
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
});

export default ProfileScreen;