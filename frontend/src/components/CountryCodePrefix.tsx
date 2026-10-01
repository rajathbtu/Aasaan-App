import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

/**
 * Country code shown to the left of a phone number field.
 */
export const COUNTRY_CODE = '+91';

const CountryCodePrefix: React.FC = () => (
  <View style={styles.container}>
    <Image
      source={require('../../assets/indian-flag.png')}
      style={styles.flag}
      resizeMode="contain" />
    <Text style={styles.code}>{COUNTRY_CODE}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    width: 18,
    height: 12,
    marginRight: spacing.sm,
  },
  code: {
    color: colors.dark,
    fontWeight: '600',
  },
});

export default CountryCodePrefix;