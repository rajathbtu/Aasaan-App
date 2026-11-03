import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

type EdgeLoaderProps = {
  height?: number;
  barWidth?: number;
  trackColor?: string;
  barColor?: string;
  duration?: number;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
};

const EdgeLoader: React.FC<EdgeLoaderProps> = ({
  height = 4,
  barWidth = 140,
  trackColor,
  barColor,
  duration = 900,
  visible = true,
  style,
}) => {
  /* Themed defaults — explicit trackColor/barColor props keep working.
     No cyan tokens exist, so the legacy cyan defaults map to the mint
     (primaryLight track / primary bar) family. */
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const track = trackColor ?? C.primaryLight;
  const bar = barColor ?? C.primary;
  const translateX = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    if (!visible) {
      translateX.setValue(-320);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 320,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -320,
          duration,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [duration, translateX, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.track, { height, backgroundColor: track }, style]}>
      <Animated.View
        style={[
          styles.bar,
          {
            width: barWidth,
            backgroundColor: bar,
            shadowColor: bar,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 999,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default EdgeLoader;
