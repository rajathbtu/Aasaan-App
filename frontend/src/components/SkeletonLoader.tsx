import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';
import AnimatedServiceIconLoader from './AnimatedServiceIconLoader';

type Props = {
  /** Number of skeleton cards to render (default 3). */
  count?: number;
};

/**
 * Reusable list skeleton shown while a screen loads its data for the first
 * time.  Renders only the animated brand service-icon loader in the middle
 * of the screen (no skeleton cards), so loading states stay clean and
 * consistent everywhere they are used.
 */
const SkeletonLoader: React.FC<Props> = ({ count = 3 }) => {
  return (
    <View style={styles.wrapper}>
      {/* Animated service-icon loader centered in the middle of the screen */}
      <AnimatedServiceIconLoader size={104} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
});

export default SkeletonLoader;