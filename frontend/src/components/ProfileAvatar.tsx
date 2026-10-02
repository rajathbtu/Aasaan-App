import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing } from '../theme';
import { getOptimizedProfileImageUrl } from '../utils/profileImage';

type ProfileAvatarProps = {
  picUrl?: string | null;
  profileName: string;
  size?: number;
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

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ picUrl, profileName, size = 48 }) => {
  const initial = String(profileName).charAt(0).toUpperCase();
  const colorIndex = (initial.charCodeAt(0) || 0) % initialColors.length;
  const initialColor = initialColors[colorIndex];
  const avatarSize = { width: size, height: size, borderRadius: size / 2 };

  return picUrl ? (
    <View style={[styles.imageWrapper, avatarSize]}>
      <Image
        source={{ uri: getOptimizedProfileImageUrl(picUrl) }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  ) : (
    <View style={[styles.imageWrapper, avatarSize, { backgroundColor: initialColor.background }]}>
      <Text style={[styles.initial, { color: initialColor.text }]}>{initial}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  initial: {
    fontWeight: '700',
    color: colors.primary,
  },
  imageWrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileAvatar;