import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import type { BasePalette } from '../theme/palette';
import { getOptimizedProfileImageUrl } from '../utils/profileImage';

type ProfileAvatarProps = {
  picUrl?: string | null;
  profileName: string;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Fixed deterministic pastel pairs for name initials. They behave like the
 * self-contained SVG/PNG artworks (see DARK_MODE_CONTRACT rule 12): the pastel
 * background and its dark ink are always paired, so each chip stays readable
 * in both light and dark mode without per-hue palette tokens.
 */
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

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ picUrl, profileName, size = 48 ,containerStyle,}) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const initial = String(profileName).charAt(0).toUpperCase();
  const colorIndex = (initial.charCodeAt(0) || 0) % initialColors.length;
  const initialColor = initialColors[colorIndex];
  const avatarSize = { width: size, height: size, borderRadius: size / 2 };

  return picUrl ? (
    <View style={[styles.imageWrapper, avatarSize, containerStyle]}>
      <Image
        source={{ uri: getOptimizedProfileImageUrl(picUrl) }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  ) : (
    <View style={[styles.imageWrapper, avatarSize, { backgroundColor: initialColor.background }, containerStyle]}>
      <Text style={[styles.initial, { color: initialColor.text, fontSize: Math.max(12, Math.round(size * 0.42)) }]}>{initial}</Text>
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  initial: {
    fontWeight: '700',
    color: C.primary,
  },
  imageWrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: C.greyLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileAvatar;
