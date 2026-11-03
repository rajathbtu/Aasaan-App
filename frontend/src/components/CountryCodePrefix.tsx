import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Country code shown to the left of a phone number field.
 */
export const COUNTRY_CODE = '+91';

const CountryCodePrefix: React.FC = () => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/indian-flag.png')}
        style={styles.flag}
        resizeMode="contain" />
      <Text style={styles.code}>{COUNTRY_CODE}</Text>
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
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
    color: C.dark,
    fontWeight: '600',
  },
});

export default CountryCodePrefix;