import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';
import { spacing } from '../theme';

const useScrolledPastBoundary = () => {

  const targetBottomYRef = useRef<number | null>(null);
  const scrollOffsetRef = useRef(0);
  const [targetScrollY, setTargetScrollY] = useState<number | null>(null);
  const [isPastBoundary, setIsPastBoundary] = useState(false);

  const updateVisibility = useCallback(() => {
    const next = targetBottomYRef.current !== null &&
      scrollOffsetRef.current >= targetBottomYRef.current;
    setIsPastBoundary(current => current === next ? current : next);
  }, []);

  const onTargetLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    targetBottomYRef.current = y + height;
    setTargetScrollY(Math.max(0, y - spacing.sm));
    updateVisibility();
  }, [updateVisibility]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    updateVisibility();
  }, [updateVisibility]);

  return { targetScrollY, isPastBoundary, onTargetLayout, onScroll };
};

export default useScrolledPastBoundary;
