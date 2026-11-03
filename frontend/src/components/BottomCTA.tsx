import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '../theme';
import type { BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomCTAProps {
  isSticky?: boolean;
  noteText?: string;
  buttonText: string;
  onPress: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  showArrow?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
}

const BottomCTA: React.FC<BottomCTAProps> = ({
  isSticky = true,
  noteText,
  buttonText,
  onPress,
  isLoading = false,
  isDisabled = false,
  showArrow = false,
  containerStyle,
  buttonStyle,
}) => {
  const { base: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
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
    <View style={[styles.container, isSticky && styles.sticky, { paddingBottom: insets.bottom || spacing.lg }, containerStyle]}>
      {noteText ? <Text style={styles.noteText}>{noteText}</Text> : null}
      <TouchableOpacity
        disabled={isDisabled || isLoading}
        onPress={onPress}
        style={[
          styles.button,
          {backgroundColor: isDisabled ? C.greyBorder : C.primary,
            opacity: isLoading ? 0.65 : 1,},
          buttonStyle,
        ]}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={C.onPrimary} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.buttonText}>{buttonText}</Text>
            {showArrow && (
              <Animated.View style={{ transform: [{ translateX: arrowTranslate }] }}>
                <Ionicons name="arrow-forward" size={16} color={C.onPrimary} style={{ marginLeft: 8 }} />
              </Animated.View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (C: BasePalette) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.greyLight,
    marginBottom: spacing.md,
  },
  sticky: {
    position: 'relative',
    left: 0,
    right: 0,
    bottom: 0,
  },
  noteText: {
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    color: C.grey,
  },
  button: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: C.onPrimary,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});

export default BottomCTA;
