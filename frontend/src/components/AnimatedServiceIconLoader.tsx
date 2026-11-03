import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import SvgIcon from '../assets/icons';
import { BrandWord } from './BrandWord';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Animated service-icon loader — the Aasaanly brand loading indicator.
 *
 * All ten service glyphs stay mounted in one absolutely-positioned stack and
 * are cycled every 250ms. Only opacity, scale and vertical translation are
 * animated, always with the native driver, so the JS thread stays free.
 * Icon artwork comes from the existing `assets/icons` SVG registry — no
 * duplicated assets, no extra animation dependency.
 */

const SWITCH_INTERVAL_MS = 300;
/** react-native-web logs warnings for useNativeDriver; guard like Spinner. */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const SERVICE_ICONS = [
  'ss-ac',
  'ss-water',
  'ss-cleaning',
  'ss-chimney',
  'ss-geyser',
  'ss-appliance',
  'ss-tv',
  'ss-microwave',
  'ss-fridge',
  'ss-brush',
] as const;

type AnimatedServiceIconLoaderProps = {
  /** Diameter of the mint icon tile. */
  size?: number;
  /** Icon switch cadence in ms (clamped to >= 180 so transitions stay visible). */
  intervalMs?: number;
  /** Render the "aasaanly" wordmark below the tile (uses BrandWord tokens). */
  showBrand?: boolean;
  style?: StyleProp<ViewStyle>;
};

type IconMotion = {
  opacity: Animated.Value;
  scale: Animated.Value;
  translateY: Animated.Value;
};

const AnimatedServiceIconLoader: React.FC<AnimatedServiceIconLoaderProps> = ({
  size = 112,
  intervalMs = SWITCH_INTERVAL_MS,
  showBrand = false,
  style,
}) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const activeIndex = useRef(0);
  const iconSize = Math.round(size * 0.34);

  // One persistent animation value set per glyph. No icon is ever
  // mounted/unmounted during the loop — only animated values change.
  const motions = useRef<IconMotion[]>(
    SERVICE_ICONS.map((_, index) => ({
      opacity: new Animated.Value(index === 0 ? 1 : 0),
      scale: new Animated.Value(index === 0 ? 1 : 0.86),
      translateY: new Animated.Value(index === 0 ? 0 : 5),
    })),
  ).current;

  useEffect(() => {
    let isMounted = true;

    const timer = setInterval(() => {
      if (!isMounted) return;

      const previousIndex = activeIndex.current;
      const nextIndex = (previousIndex + 1) % SERVICE_ICONS.length;
      activeIndex.current = nextIndex;

      const previous = motions[previousIndex];
      const next = motions[nextIndex];

      // Outgoing icon: quick fade while drifting up and shrinking slightly.
      Animated.parallel([
        Animated.timing(previous.opacity, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(previous.scale, {
          toValue: 0.88,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(previous.translateY, {
          toValue: -5,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();

      // Incoming icon: reset the already-mounted layer, then pop it into
      // place with a snappy native spring.
      next.opacity.setValue(0);
      next.scale.setValue(0.8);
      next.translateY.setValue(7);
      Animated.parallel([
        Animated.timing(next.opacity, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(next.scale, {
          toValue: 1,
          damping: 11,
          stiffness: 240,
          mass: 0.6,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(next.translateY, {
          toValue: 0,
          damping: 12,
          stiffness: 220,
          mass: 0.6,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    }, Math.max(180, intervalMs));

    return () => {
      isMounted = false;
      clearInterval(timer);
      motions.forEach((motion) => {
        motion.opacity.stopAnimation();
        motion.scale.stopAnimation();
        motion.translateY.stopAnimation();
      });
    };
  }, [intervalMs, motions]);

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.tile,
          { width: size, height: size, borderRadius: size * 0.29 },
        ]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
      >
        <View style={[styles.iconStack, { width: iconSize, height: iconSize }]} pointerEvents="none">
          {SERVICE_ICONS.map((icon, index) => {
            const motion = motions[index];
            return (
              <Animated.View
                key={icon}
                style={[
                  styles.iconLayer,
                  {
                    opacity: motion.opacity,
                    transform: [
                      { translateY: motion.translateY },
                      { scale: motion.scale },
                    ],
                  },
                ]}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <SvgIcon name={icon} size={iconSize} color={C.primary} />
              </Animated.View>
            );
          })}
        </View>
      </View>
      {showBrand && <BrandWord style={styles.brand} />}
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  iconStack: {
    position: 'relative',
  },
  iconLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginTop: 18,
    fontSize: 25,
    letterSpacing: -0.8,
  },
});

export default AnimatedServiceIconLoader;
