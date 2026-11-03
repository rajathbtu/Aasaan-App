import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

const LaunchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { base: C } = useTheme();

  // Navigate immediately on mount — App.tsx already holds the splash
  // strictly visible for 1.5s from app start, so no extra delay needed here.
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('LanguageSelection');
    }, 0);
    return () => clearTimeout(timer);
  }, [navigation]);

  const styles = useMemo(() => makeStyles(C), [C]);

  return <View style={styles.container} />;
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  container: {
    flex: 1,
    // Branded launch canvas: plain white in light, dark card surface in dark.
    backgroundColor: C.white,
  },
});

export default LaunchScreen;
