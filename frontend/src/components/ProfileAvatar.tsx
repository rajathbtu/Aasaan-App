import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type ProfileAvatarProps = {
  profilePic?: string | null;
  profileName: string;
};

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ profilePic, profileName }) => (
  profilePic ? (
    <View style={styles.imageWrapper}>
      <Image source={{ uri: profilePic }} style={styles.image} />
    </View>
  ) : (
    <View style={styles.placeholder}>
      <Text style={styles.initial}>{String(profileName).charAt(0).toUpperCase()}</Text>
    </View>
  )
);

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