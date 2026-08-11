import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

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
  trackColor = '#d9f5f5',
  barColor = '#4dd0e1',
  duration = 900,
  visible = true,
  style,
}) => {
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
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <Animated.View
        style={[
          styles.bar,
          {
            width: barWidth,
            backgroundColor: barColor,
            shadowColor: barColor,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
