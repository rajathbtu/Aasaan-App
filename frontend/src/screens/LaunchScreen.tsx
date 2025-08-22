import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';

/**
 * A simple splash screen shown on startup.  It displays the app name
 * briefly and then navigates to the language selection page.  In a real
 * application you might perform initialisation such as preloading
 * resources or checking the authentication state here.  We defer to the
 * authentication context in the root navigator for persistent login.
 */
const LaunchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('LanguageSelection');
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigation]);
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Aasaan</Text>
      <Text style={styles.subtitle}>{t('launch.subtitle')}</Text>
      <View style={styles.footer}>
        <Image
          source={require('../../assets/indian-flag.png')}
          style={styles.flag}
          resizeMode="contain"
        />
        <Text style={styles.madeInIndia}>Made in India</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: spacing.lg,
  },
  hint: {
    fontSize: 12,
    color: colors.grey,
  },
  footer: {
    position: 'absolute',
    bottom: 150,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    width: 36,
    height: 24,
    marginRight: 8,
  },
  madeInIndia: {
    fontSize: 16,
    color: colors.grey,
    fontWeight: '600',
  },
});

export default LaunchScreen;