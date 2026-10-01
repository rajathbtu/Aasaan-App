import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type ProfileAvatarProps = {
  profilePic?: string | null;
  profileName: string;
};

const initialColors = [
  { background: '#FCE4D6', text: '#9A3412' },
  { background: '#CCFBF1', text: '#115E59' },
  { background: '#EDE9FE', text: '#5B21B6' },
  { background: '#FEF3C7', text: '#92400E' },
  { background: '#DBEAFE', text: '#1E40AF' },
  { background: '#FCE7F3', text: '#9D174D' },
  { background: '#ECFCCB', text: '#3F6212' },
  { background: '#E2E8F0', text: '#334155' },
];

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ profilePic, profileName }) => {
  const initial = String(profileName).charAt(0).toUpperCase();
  const colorIndex = (initial.charCodeAt(0) || 0) % initialColors.length;
  const initialColor = initialColors[colorIndex];

  return profilePic ? (
    <View style={styles.imageWrapper}>
      <Image source={{ uri: profilePic }} style={styles.image} />
    </View>
  ) : (
    <View style={[styles.placeholder, { backgroundColor: initialColor.background }]}>
      <Text style={[styles.initial, { color: initialColor.text }]}>{initial}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  initial: {
    fontWeight: '700',
    color: colors.primary,
  },
  imageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.greyLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileAvatar;