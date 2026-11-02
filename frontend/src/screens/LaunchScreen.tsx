import React, { useEffect } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import splashContent from '../../assets/splash/splash-content-exact.png';

/**
 * Aasaanly splash — Splash_Screen_Handoff approved design.
 *
 * The approved reference is the source of truth. Its only baked-in fake
 * element (the sample status bar) was cropped off at handoff time, so the
 * app renders the exact approved artwork below the native OS status bar:
 * green aasaanly wordmark with accent strokes, tagline with mint underline,
 * cityscape, Made in India footer and layered bottom waves — all in the
 * reference's own order and spacing. No gear, buttons or spinner.
 *
 * Layout rules from the handoff (matching index-standalone.html):
 * - Artwork is never stretched or cropped: it is fitted INSIDE the viewport
 *   on both axes (width-capped at the 430px phone-first canvas, then
 *   height-clamped for short/wide viewports), so the full composition —
 *   logo, tagline, cityscape, footer and waves — is always visible.
 * - Centered horizontally and vertically (like index-standalone.html on
 *   mobile); white #FFFFFF background matching the standalone preview.
 */

/** Width/height ratio of the approved artwork below its baked-in status bar. */
const SPLASH_ASPECT = 941 / 1620;
/** Pale background matching index-standalone.html mobile view. */
const SPLASH_BG = '#FFFFFF';
/** Phone-first canvas cap from the handoff preview. */
const MAX_CANVAS_WIDTH = 430;

const LaunchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width: winW, height: winH } = useWindowDimensions();

  /* Contain-fit with explicit numbers (no reliance on aspectRatio style):
     fit by width first, then clamp by height so short/wide viewports see
     the entire artwork instead of a cropped, zoomed-in slice. */
  let renderW = Math.min(winW, MAX_CANVAS_WIDTH);
  let renderH = renderW / SPLASH_ASPECT;
  if (renderH > winH) {
    renderH = winH;
    renderW = renderH * SPLASH_ASPECT;
  }

  useEffect(() => {
    // Navigate immediately on mount — App.tsx already holds the splash
    // strictly visible for 1.5s from app start, so no extra delay needed here.
    const timer = setTimeout(() => {
      navigation.navigate('LanguageSelection');
    }, 0);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={splashContent}
        style={{ width: renderW, height: renderH }}
        resizeMode="contain"
        accessibilityLabel="aasaanly — Connecting you with local help. Made in India."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LaunchScreen;
