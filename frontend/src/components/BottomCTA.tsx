import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomCTAProps {
  isSticky?: boolean;
  noteText?: string;
  buttonText: string;
  onPress: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  showArrow?: boolean;
}

const BottomCTA: React.FC<BottomCTAProps> = ({
  isSticky = true,
  noteText,
  buttonText,
  onPress,
  isLoading = false,
  isDisabled = false,
  showArrow = false,
}) => {
  const insets = useSafeAreaInsets();
  const arrowAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showArrow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrowAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(arrowAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      arrowAnimation.stopAnimation();
    }
  }, [showArrow]);

  const arrowTranslate = arrowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  return (
    <View style={[styles.container, isSticky && styles.sticky, { paddingBottom: insets.bottom || spacing.lg }]}>
      {noteText && <Text style={styles.noteText}>{noteText}</Text>}
      <TouchableOpacity
        disabled={isDisabled || isLoading}
        onPress={onPress}
        style={[
          styles.button,
          { backgroundColor: isDisabled || isLoading ? colors.greyBorder : colors.primary },
        ]}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.buttonText}>{buttonText}</Text>
            {showArrow && (
              <Animated.View style={{ transform: [{ translateX: arrowTranslate }] }}>
                <Ionicons name="arrow-forward" size={16} color={colors.white} style={{ marginLeft: 8 }} />
              </Animated.View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  noteText: {
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    color: colors.grey,
  },
  button: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BottomCTA;
