import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import DetectedLocationCard from './DetectedLocationCard';

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
  showNotification?: boolean;
  notificationCount?: number;
  customRightComponent?: React.ReactNode; // New prop for custom UI
  keepTitleCenterAligned?: boolean; // New optional prop
  subheader?: string; // Optional subtle subheader shown above the title
};

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = true,
  showNotification = true,
  notificationCount = 0,
  customRightComponent,
  keepTitleCenterAligned = false, // Default to false
  subheader,
}) => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        {showBackButton && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          {subheader ? (
            <Text style={styles.subHeaderText}>{subheader}</Text>
          ) : null}
          <Text style={[styles.headerTitle,
              keepTitleCenterAligned && styles.centerAlignedTitle, // Apply center alignment to title if the prop is true
            ]}
          >{title}</Text>
        </View>
        {customRightComponent ? (
          customRightComponent // Render custom UI if provided
        ) : (
        showNotification && (
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={20} color={colors.dark} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )
        )}
      </View>
       {/* <DetectedLocationCard /> */}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.light,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3, // For Android shadow
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Ensure left alignment of content
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    paddingRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'left',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  subHeaderText: {
    fontSize: 12,
    color: colors.greyMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  centerAlignedTitle: {
    textAlign: 'center', // Center align title text
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.accent,
    borderRadius: 10,
    height: 20,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Header;
