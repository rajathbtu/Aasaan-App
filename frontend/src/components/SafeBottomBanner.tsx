import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SafeBottomBannerProps {
  minPadding?: number;
}

/**
 * SafeBottomBanner - A simple overlay component that covers the area above device
 * navigation buttons and status bars while respecting safe area insets.
 *
 * This component only renders a translucent overlay in the theme's surface
 * colour to prevent content from being hidden behind device navigation
 * buttons on different devices.
 * It does not accept children - use it as a standalone overlay.
 */
const SafeBottomBanner: React.FC<SafeBottomBannerProps> = ({ minPadding = 8 }) => {
  const insets = useSafeAreaInsets();
  const { base: C } = useTheme();
  const safeBottom = Math.max(insets.bottom, minPadding);

  return (
    <View style={{ marginTop: safeBottom,}}>
        <View
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: safeBottom,
                backgroundColor: C.white,
                zIndex: 9,
            }}
        />
    </View>
  );
};

export default SafeBottomBanner;
