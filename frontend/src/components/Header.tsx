import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationCount } from '../contexts/NotificationCountContext';
import SvgIcon from '../assets/icons';
import { BRAND_WORD_COLOR, BRAND_WORD_FONT } from './BrandWord';

/**
 * Consistent header used across all screens:
 *  - LocationSelectScreen (Service Area)
 *  - NotificationsScreen (Notifications)
 *  - SPSelectServicesScreen (Service Selection)
 *  - ProfileScreen (Profile)
 *
 * Shared pattern:
 *  - Height 60, padding horizontal 16, gap 13
 *  - Back button: 38x38, radius 19, bg #EFF8F3
 *  - Title: font-size 19, font-weight bold, color ink #202B28
 *  - Border bottom: hairline #E5EBE8
 *  - Right actions: bell / profile icon buttons
 */
const HEADER_HEIGHT = 60;
const BACK_BUTTON_SIZE = 42;
const ICON_BUTTON_SIZE = 35;
const GREEN_PRIMARY = '#079447';

const Header: React.FC<{
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showNotification?: boolean;
  showProfileButton?: boolean;
  customLeftComponent?: React.ReactNode;
  customRightComponent?: React.ReactNode;
  belowHeaderContent?: React.ReactNode;
  keepTitleCenterAligned?: boolean;
  extraLargeTitle?: boolean;
  subheader?: string;
  titleStyle?: any;
}> = ({
  title,
  showBackButton = true,
  onBackPress,
  showNotification = true,
  showProfileButton = false,
  customLeftComponent,
  customRightComponent,
  belowHeaderContent,
  keepTitleCenterAligned = false,
  extraLargeTitle = false,
  subheader,
  titleStyle,
}) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotificationCount();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight ?? 0)
    : insets.top;

  const displayTitle = title || 'aasaanly';
  /* When the header shows the brand word alone, render it with the splash
     wordmark style so the logo reads identically across the app. */
  const isBrandTitle = displayTitle.toLowerCase() === 'aasaanly';

  const handleBackPress = useCallback(
    () => (onBackPress ? onBackPress() : navigation.goBack()),
    [onBackPress, navigation],
  );
  const handleProfilePress = useCallback(() => navigation.navigate('Profile'), [navigation]);
  const handleNotificationPress = useCallback(() => navigation.navigate('Notifications'), [navigation]);

  return (
    <View style={[styles.safeArea, { paddingTop: topInset }]}>
      <View style={styles.headerRow}>
        {customLeftComponent ?? (showBackButton && (
          <TouchableOpacity
            style={[styles.iconButton, { marginRight: spacing.md }]}
            onPress={handleBackPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <SvgIcon name="sa-back" size={22} color={colors.dark} />
          </TouchableOpacity>
        ))}
        <View style={[styles.titleContainer, keepTitleCenterAligned && styles.centeredTitleContainer]}>
          <Text numberOfLines={1} ellipsizeMode="tail"
            style={[
              styles.headerTitle,
              keepTitleCenterAligned && styles.centerAlignedTitle,
              extraLargeTitle && styles.extraLargeTitle,
              isBrandTitle && styles.brandTitle,
              titleStyle,
            ]}>
            {displayTitle}
          </Text>
          {subheader ? <Text numberOfLines={2} style={styles.subHeaderText}>{subheader}</Text> : null}
          {belowHeaderContent}
        </View>
        {keepTitleCenterAligned && <View style={styles.titleContainer} />}
        {customRightComponent ?? (
          <View style={styles.rightActions}>
            {showProfileButton && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleProfilePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Profile"
              >
                <SvgIcon name="user" size={20} color={colors.dark} />
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
                <SvgIcon name="bell" size={20} color={colors.dark} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 20 ? '20+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    minHeight: HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.greyBorder,
    backgroundColor: colors.white,
  },
  iconButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: BACK_BUTTON_SIZE / 2,
    backgroundColor: '#EFF8F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarContainer: {
    marginRight: 0,
    borderWidth: 1,
    borderColor: colors.greyMuted,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  centeredTitleContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.dark,
    textAlign: 'left',
    letterSpacing: -0.3,
    minWidth: 0,
  },
  centerAlignedTitle: {
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#68716F',
    fontFamily: 'Inter',
    marginTop: 3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 3,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN_PRIMARY,
    borderWidth: 1,
    borderColor: colors.white,
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  extraLargeTitle: {
    fontSize: 22,
  },
  /* Splash wordmark treatment for brand-only header titles. */
  brandTitle: {
    fontFamily: BRAND_WORD_FONT,
    fontWeight: '700',
    color: BRAND_WORD_COLOR,
    letterSpacing: -0.5,
  },
});

export default Header;
