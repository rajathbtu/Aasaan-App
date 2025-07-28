import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

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
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
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

  const toggleRole = async () => {
    const newRole = user.role === 'endUser' ? 'serviceProvider' : 'endUser';
    try {
      await updateUser({ role: newRole });
      if (newRole === 'serviceProvider') {
        navigation.navigate('SPSelectServices');
      } else {
        navigation.navigate('Main');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to switch role');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.fieldRow}>
        <Text style={styles.label}>Name:</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        ) : (
          <Text style={styles.value}>{user.name}</Text>
        )}
        {editing ? (
          <TouchableOpacity onPress={saveName}>
            <Text style={styles.link}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.link}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.value}>{user.phoneNumber || user.phone}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.label}>Role:</Text>
        <Text style={styles.value}>{user.role === 'endUser' ? 'End User' : 'Service Provider'}</Text>
        <TouchableOpacity onPress={toggleRole}>
          <Text style={styles.link}>Switch</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.label}>Credits:</Text>
        <Text style={styles.value}>{user.creditPoints}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.label}>Plan:</Text>
        <Text style={styles.value}>{user.plan}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.link}>Upgrade</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
        <Text style={styles.menuText}>Notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={logout}>
        <Text style={[styles.menuText, { color: '#ef4444' }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    color: '#111827',
    textAlign: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 80,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  link: {
    color: '#2563eb',
    fontSize: 14,
    marginLeft: 8,
  },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuText: {
    fontSize: 16,
    color: '#2563eb',
  },
});

export default ProfileScreen;