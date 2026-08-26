import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { useNotificationCount } from '../contexts/NotificationCountContext';

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showNotification?: boolean;
  showProfileButton?: boolean;
  customRightComponent?: React.ReactNode;
  keepTitleCenterAligned?: boolean;
  subheader?: string;
};

/** Max unread count rendered inside the badge before capping to "20+". */
const MAX_BADGE_COUNT = 20;

// Shared metrics so every icon control has the same comfortable touch target.
const ICON_BUTTON_SIZE = 38;

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  showNotification = true,
  showProfileButton = false,
  customRightComponent,
  keepTitleCenterAligned = false,
  subheader,
}) => {
  const navigation = useNavigation<any>();
  const { unreadCount } = useNotificationCount();

  const handleBackPress = useCallback(
    () => (onBackPress ? onBackPress() : navigation.goBack()),
    [onBackPress, navigation],
  );
  const handleProfilePress = useCallback(() => navigation.navigate('Profile'), [navigation]);
  const handleNotificationPress = useCallback(() => navigation.navigate('Notifications'), [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.dark} />
          </TouchableOpacity>
        )}

        <View style={[styles.titleContainer, keepTitleCenterAligned && styles.centeredTitleContainer]}>
          {subheader ? <Text style={styles.subHeaderText}>{subheader}</Text> : null}
          <Text
            style={[styles.headerTitle, keepTitleCenterAligned && styles.centerAlignedTitle]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </View>

        {customRightComponent ?? (
          <View style={styles.rightActions}>
            {showProfileButton && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleProfilePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <Ionicons name="person-circle-outline" size={24} color={colors.dark} />
              </TouchableOpacity>
            )}
            {showNotification && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleNotificationPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
                }
              >
                <Ionicons name="notifications-outline" size={22} color={colors.dark} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.greyLight,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2, // Android shadow
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    borderRadius: ICON_BUTTON_SIZE / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  centeredTitleContainer: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'left',
  },
  centerAlignedTitle: {
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 11,
    color: colors.greyMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default Header;
