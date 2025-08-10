import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a valid name');
      return;
    }
    try {
      await updateUser({ name: trimmed });
      setEditing(false);
      Alert.alert('Updated', 'Name updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update name');
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.light }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {editing ? (
          <TouchableOpacity onPress={saveName}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Ionicons name="person-circle" size={96} color={colors.primary} />
        <TouchableOpacity style={styles.cameraBadge}>
          <Ionicons name="camera" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.avatarNote}>Tap to change your profile photo</Text>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        {/* Full Name */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Full Name</Text>
          {editing ? (
            <TextInput
              style={styles.inputField}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.grey}
            />
          ) : (
            <Text style={styles.inputValue}>{user.name}</Text>
          )}
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editIcon}>
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        {/* Mobile number */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Mobile Number</Text>
          <Text style={styles.inputValue}>{user.phoneNumber || user.phone}</Text>
          <TouchableOpacity disabled style={styles.editIcon}>
            <Ionicons name="pencil" size={16} color={colors.greyLight} />
          </TouchableOpacity>
        </View>
        {/* Language */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Language</Text>
          <Text style={styles.inputValue}>{user.language || 'English'}</Text>
          <TouchableOpacity disabled style={styles.editIcon}>
            <Ionicons name="pencil" size={16} color={colors.greyLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Role */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Role</Text>
        <View style={styles.rolesRow}>
          <TouchableOpacity
            style={[styles.roleCard, user.role === 'endUser' && styles.roleCardSelected]}
            onPress={() => toggleRole('endUser')}
          >
            <Ionicons name="search" size={24} color={user.role === 'endUser' ? colors.primary : colors.grey} style={{ marginBottom: spacing.sm }} />
            <Text style={styles.roleText}>Find people to get work done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleCard, user.role === 'serviceProvider' && styles.roleCardSelected]}
            onPress={() => toggleRole('serviceProvider')}
          >
            <Ionicons name="briefcase" size={24} color={user.role === 'serviceProvider' ? colors.primary : colors.grey} style={{ marginBottom: spacing.sm }} />
            <Text style={styles.roleText}>Find work opportunities</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Service provider information */}
      {user.role === 'serviceProvider' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Provider Information</Text>
          <Text style={styles.subheading}>Services Offered</Text>
          <View style={styles.servicesRow}>
            {user.services && user.services.length > 0 ? (
              user.services.map((svc: string) => (
                <View key={svc} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{svc}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 12, color: colors.grey }}>No services selected</Text>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('SPSelectServices')} style={styles.addServiceButton}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addServiceText}>Add Service</Text>
            </TouchableOpacity>
          </View>
          {/* Service Location */}
          <Text style={styles.subheading}>Service Location</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SPSelectLocation')} style={styles.locationField}>
            <Ionicons name="location" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.locationText}>{user.serviceLocation || 'Select location'}</Text>
            <Ionicons name="pencil" size={14} color={colors.primary} style={{ marginLeft: spacing.sm }} />
          </TouchableOpacity>
          {/* Service Radius */}
          <Text style={styles.subheading}>Service Radius</Text>
          <View style={styles.radiusRow}>
            {[5, 10, 15, 20].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusButton, user.radius === r && styles.radiusButtonSelected]}
                onPress={() => updateUser({ radius: r })}
              >
                <Text style={[styles.radiusButtonText, user.radius === r && { color: '#fff' }]}>{r} km</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Upgrade card */}
      <View style={styles.section}>
        <View style={styles.upgradeCard}>
          <Ionicons name="crown" size={28} color={colors.primary} style={{ marginRight: spacing.md }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>Upgrade to Professional</Text>
            <Text style={styles.upgradeSubtitle}>Get more work opportunities</Text>
            <View style={styles.upgradeFeatures}>
              <Text style={styles.upgradeFeature}><Ionicons name="checkmark" size={12} color={colors.secondary} />  Early notifications for new work requests</Text>
              <Text style={styles.upgradeFeature}><Ionicons name="checkmark" size={12} color={colors.secondary} />  Multiple service locations (up to 5)</Text>
              <Text style={styles.upgradeFeature}><Ionicons name="checkmark" size={12} color={colors.secondary} />  Increased service radius (up to 20km)</Text>
              <Text style={styles.upgradeFeature}><Ionicons name="checkmark" size={12} color={colors.secondary} />  Priority listing for end users</Text>
            </View>
            <Text style={styles.upgradePrice}>Starting from <Text style={{ color: colors.primary }}>₹100/month</Text></Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Subscription')} style={styles.viewPlansButton}>
            <Text style={styles.viewPlansText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout and deactivate */}
      <View style={styles.section}>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={18} color={colors.error} style={{ marginRight: spacing.sm }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Alert.alert('Deactivate', 'Account deactivation is not available in this demo')} style={styles.deactivateButton}>
          <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: spacing.sm }} />
          <Text style={styles.deactivateText}>Deactivate Account</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.versionText}>Version 1.2.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
  },
  saveText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.xs,
  },
  avatarNote: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.grey,
    marginBottom: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  inputLabel: {
    width: 120,
    fontSize: 14,
    color: colors.grey,
  },
  inputField: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: colors.greyLight,
    fontSize: 14,
    color: colors.dark,
    paddingVertical: spacing.xs,
  },
  inputValue: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
  },
  editIcon: {
    padding: spacing.sm,
  },
  rolesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eef2ff',
  },
  roleText: {
    fontSize: 12,
    color: colors.dark,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grey,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  serviceChip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  serviceChipText: {
    fontSize: 12,
    color: colors.primary,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addServiceText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  locationField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: colors.dark,
  },
  radiusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.greyLight,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  radiusButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusButtonText: {
    fontSize: 12,
    color: colors.dark,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: spacing.xs,
  },
  upgradeFeatures: {
    marginBottom: spacing.xs,
  },
  upgradeFeature: {
    fontSize: 12,
    color: colors.dark,
    marginBottom: 2,
  },
  upgradePrice: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: spacing.xs,
  },
  viewPlansButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  viewPlansText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deactivateText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.grey,
    marginVertical: spacing.lg,
  },
});

export default ProfileScreen;