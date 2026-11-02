import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/** Pale background matching index-standalone.html mobile view. */
const SPLASH_BG = '#FFFFFF';

const LaunchScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Navigate immediately on mount — App.tsx already holds the splash
  // strictly visible for 1.5s from app start, so no extra delay needed here.
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('LanguageSelection');
    }, 0);
    return () => clearTimeout(timer);
  }, [navigation]);

  return <View style={styles.container} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
});

export default LaunchScreen;
