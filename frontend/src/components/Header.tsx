import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
  showNotification?: boolean;
  notificationCount?: number;
};

const Header: React.FC<HeaderProps> = ({ title, showBackButton = true, showNotification = true, notificationCount = 0 }) => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        {showBackButton && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.dark} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        {showNotification && (
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
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.light,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
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
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Header;
