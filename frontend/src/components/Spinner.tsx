import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

type SpinnerProps = {
  size?: 'small' | 'large' | number;
  color?: string;
};

/**
 * Cross-platform spinner that replicates react-native-web's ActivityIndicator
 * (the look users see on mweb): a full-circle "track" outline in the given
 * color at 20% opacity plus a quarter arc in full color, rotating 360deg
 * linearly every 750ms. Android's native ActivityIndicator only supports a
 * single solid color, so this component guarantees an identical look on
 * Android, iOS and web.
 */

const PRESET_SIZES = { small: 20, large: 36 };

const Spinner: React.FC<SpinnerProps> = ({ size = 'small', color = '#1976D2' }) => {
  const dimension = typeof size === 'number' ? size : PRESET_SIZES[size];
  const strokeWidth = dimension * (4 / 32);
  const radius = dimension / 2;

  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 750,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{
        width: dimension,
        height: dimension,
        transform: [{ rotate }],
      }}>
      {/* Light track: full circle outline at 20% opacity */}
      <View style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: radius,
          borderWidth: strokeWidth,
          borderColor: color,
          opacity: 0.2,
        }}/>
      {/* Dark arc: full-color circle clipped to one quadrant, leaving a
          quarter arc (matches react-native-web's strokeDasharray/offset) */}
      <View style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: radius,
          height: radius,
          overflow: 'hidden'}}>
        <View style={{
            width: dimension,
            height: dimension,
            borderRadius: radius,
            borderWidth: strokeWidth,
            borderColor: color,
          }}/>
      </View>
    </Animated.View>
  );
};

export default Spinner;
