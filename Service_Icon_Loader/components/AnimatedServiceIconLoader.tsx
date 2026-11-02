import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Text,
  ViewStyle,
} from "react-native";

// Reuse the app's existing SVG registry. It already contains the ss-* assets.
import SvgIcon from "@/assets/icons";

const SWITCH_INTERVAL_MS = 250;
const ICON_SIZE = 38;
const BRAND_GREEN = "#079B60";
const BRAND_MINT = "#E8F8F0";

const SERVICE_ICONS = [
  { id: "ac", label: "AC service", icon: "ss-ac" },
  { id: "plumbing", label: "Plumbing", icon: "ss-water" },
  { id: "cleaning", label: "Cleaning", icon: "ss-cleaning" },
  { id: "chimney", label: "Chimney service", icon: "ss-chimney" },
  { id: "geyser", label: "Geyser service", icon: "ss-geyser" },
  { id: "appliance", label: "Appliance repair", icon: "ss-appliance" },
  { id: "tv", label: "TV repair", icon: "ss-tv" },
  { id: "microwave", label: "Microwave repair", icon: "ss-microwave" },
  { id: "fridge", label: "Refrigerator repair", icon: "ss-fridge" },
  { id: "painting", label: "Painting", icon: "ss-brush" },
] as const;

type Props = {
  subtitle?: string;
  showBrand?: boolean;
  size?: number;
  style?: ViewStyle;
  intervalMs?: number;
};

type IconMotion = {
  opacity: Animated.Value;
  scale: Animated.Value;
  translateY: Animated.Value;
};

export default function AnimatedServiceIconLoader({
  subtitle = "Connecting you with local help",
  showBrand = true,
  size = 112,
  style,
  intervalMs = SWITCH_INTERVAL_MS,
}: Props) {
  const activeIndex = useRef(0);

  // One persistent animation state per SVG. No icon is mounted/unmounted
  // during the loop; only opacity and transform values are updated.
  const motions = useRef<IconMotion[]>(
    SERVICE_ICONS.map((_, index) => ({
      opacity: new Animated.Value(index === 0 ? 1 : 0),
      scale: new Animated.Value(index === 0 ? 1 : 0.86),
      translateY: new Animated.Value(index === 0 ? 0 : 5),
    }))
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

      // The outgoing icon fades and moves up slightly.
      Animated.parallel([
        Animated.timing(previous.opacity, {
          toValue: 0,
          duration: 115,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(previous.scale, {
          toValue: 0.9,
          duration: 115,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(previous.translateY, {
          toValue: -4,
          duration: 115,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // Reset the next, already-mounted icon before animating it in.
      next.opacity.setValue(0);
      next.scale.setValue(0.84);
      next.translateY.setValue(6);

      // The incoming icon pops into place with a native spring.
      Animated.parallel([
        Animated.timing(next.opacity, {
          toValue: 1,
          duration: 145,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(next.scale, {
          toValue: 1,
          damping: 10,
          stiffness: 230,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.spring(next.translateY, {
          toValue: 0,
          damping: 11,
          stiffness: 210,
          mass: 0.7,
          useNativeDriver: true,
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
          styles.brandContainer,
          { width: size, height: size, borderRadius: size * 0.29 },
        ]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading Aasaanly services"
      >
        <View
          style={[
            styles.iconStack,
            { width: ICON_SIZE, height: ICON_SIZE },
          ]}
          pointerEvents="none"
        >
          {SERVICE_ICONS.map((service, index) => {
            const motion = motions[index];

            return (
              <Animated.View
                key={service.id}
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
                <SvgIcon
                  name={service.icon}
                  size={ICON_SIZE}
                  color={BRAND_GREEN}
                />
              </Animated.View>
            );
          })}
        </View>
      </View>

      {showBrand && (
        <Text style={styles.brandName}>aasaanly</Text>
      )}

      {!!subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_MINT,
    borderWidth: 1,
    borderColor: "#D5F0E2",
  },
  iconStack: {
    position: "relative",
  },
  iconLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    marginTop: 18,
    color: BRAND_GREEN,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    color: "#77827E",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
