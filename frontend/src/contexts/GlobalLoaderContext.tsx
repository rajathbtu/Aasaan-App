import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AnimatedServiceIconLoader from '../components/AnimatedServiceIconLoader';
import { BrandWord } from '../components/BrandWord';
import { hexWithAlpha } from '../components/ServiceIcon';
import { spacing } from '../theme';
import { basePalettes } from '../theme/palette';
import { useTheme } from './ThemeContext';

/**
 * Global blocking loader — one shared, always-centred overlay for the whole
 * app. Any screen can call `showLoader()` / `hideLoader()` via `useGlobalLoader()`;
 * the overlay itself is rendered once here, above navigation, modals included.
 *
 * Overlapping operations are handled with a reference counter: the overlay
 * hides only when the last operation calls `hideLoader()`, so one operation
 * can never hide another one's loader. A short show-delay keeps very fast
 * requests flash-free, and a minimum on-screen time avoids jarring blips.
 */

type GlobalLoaderContextValue = {
  /** Show the blocking loader. Optional contextual message, e.g. t('loader.pleaseWait'). */
  showLoader: (message?: string) => void;
  /** Mark one operation as finished. Extra calls are safely ignored. */
  hideLoader: () => void;
  /** Change the visible message without affecting the reference counter. */
  updateMessage: (message: string) => void;
  /** True while the overlay is mounted on screen. */
  isVisible: boolean;
};

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | undefined>(undefined);

/** Delay before the overlay appears — filters out very fast operations. */
const SHOW_DELAY_MS = 180;
/** Once shown, keep the overlay up at least this long to avoid blips. */
const MIN_VISIBLE_MS = 400;
const FADE_IN_MS = 200;
const FADE_OUT_MS = 160;
const DEFAULT_MESSAGE = 'Please wait…';
/** react-native-web logs warnings for useNativeDriver; guard like Spinner. */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export const GlobalLoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { base } = useTheme();
  const styles = useMemo(() => makeStyles(base), [base]);
  const [shown, setShown] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const messageRef = useRef(DEFAULT_MESSAGE);
  /** Number of in-flight operations that requested the loader. */
  const countRef = useRef(0);
  /** Whether the overlay is currently mounted. */
  const shownRef = useRef(false);
  /** Whether a dismissal is scheduled or animating out. */
  const hidingRef = useRef(false);
  const shownAtRef = useRef(0);
  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeOutAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;

  const present = useCallback(
    (fresh: boolean) => {
      if (fresh) {
        opacity.setValue(0);
        cardScale.setValue(0.92);
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_IN_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          damping: 14,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    },
    [cardScale, opacity],
  );

  const dismiss = useCallback(() => {
    hidingRef.current = true;
    fadeOutAnimRef.current = Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    fadeOutAnimRef.current.start(({ finished }) => {
      if (!hidingRef.current) return; // a new showLoader cancelled the dismissal
      if (finished) {
        hidingRef.current = false;
        shownRef.current = false;
        setShown(false);
      }
    });
  }, [opacity]);

  const showLoader = useCallback(
    (nextMessage?: string) => {
      countRef.current += 1;
      if (nextMessage) messageRef.current = nextMessage;
      if (minHoldTimerRef.current) {
        clearTimeout(minHoldTimerRef.current);
        minHoldTimerRef.current = null;
      }
      if (displayTimerRef.current) return; // presentation already scheduled
      if (shownRef.current) {
        if (hidingRef.current) {
          hidingRef.current = false;
          fadeOutAnimRef.current?.stop();
        }
        setMessage(messageRef.current);
        shownAtRef.current = Date.now();
        present(false); // already on screen — continue from current values
        return;
      }
      displayTimerRef.current = setTimeout(() => {
        displayTimerRef.current = null;
        shownRef.current = true;
        hidingRef.current = false;
        shownAtRef.current = Date.now();
        setMessage(messageRef.current);
        setShown(true);
        present(true);
        AccessibilityInfo.announceForAccessibility(messageRef.current);
      }, SHOW_DELAY_MS);
    },
    [present],
  );

  const hideLoader = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current > 0) return; // another operation still needs the loader
    if (displayTimerRef.current) {
      // Still within the show delay — cancel before it ever appears.
      clearTimeout(displayTimerRef.current);
      displayTimerRef.current = null;
      return;
    }
    if (!shownRef.current || hidingRef.current) return;
    const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
    if (remaining > 0) {
      minHoldTimerRef.current = setTimeout(() => {
        minHoldTimerRef.current = null;
        if (countRef.current === 0) dismiss();
      }, remaining);
    } else {
      dismiss();
    }
  }, [dismiss]);

  const updateMessage = useCallback((nextMessage: string) => {
    messageRef.current = nextMessage;
    if (shownRef.current || displayTimerRef.current) setMessage(nextMessage);
  }, []);

  // Stop timers and animations when the provider unmounts.
  useEffect(
    () => () => {
      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
      if (minHoldTimerRef.current) clearTimeout(minHoldTimerRef.current);
      fadeOutAnimRef.current?.stop();
      opacity.stopAnimation();
      cardScale.stopAnimation();
    },
    [cardScale, opacity],
  );

  const value = useMemo(
    () => ({ showLoader, hideLoader, updateMessage, isVisible: shown }),
    [showLoader, hideLoader, updateMessage, shown],
  );

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      {shown && (
        <Modal
          transparent
          visible
          animationType="none"
          statusBarTranslucent
          // The loader blocks the workflow; Android back must not dismiss it.
          onRequestClose={() => {}}
        >
          <Animated.View
            style={[styles.scrim, { opacity }]}
            pointerEvents="auto"
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={message}
          >
            <Animated.View
              style={[styles.card, { transform: [{ scale: cardScale }] }]}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={message}
            >
              <AnimatedServiceIconLoader size={104} />
              <BrandWord style={styles.brand} />
              <Text style={styles.message}>{message}</Text>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </GlobalLoaderContext.Provider>
  );
};

export const useGlobalLoader = (): GlobalLoaderContextValue => {
  const context = useContext(GlobalLoaderContext);
  if (!context) throw new Error('useGlobalLoader must be used within GlobalLoaderProvider');
  return context;
};

const makeStyles = (C: typeof basePalettes.light) => StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hexWithAlpha(C.primarySoft, 0.86),
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 224,
    maxWidth: '82%',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 28,
    backgroundColor: C.imageBg,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    shadowColor: C.primary,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  brand: {
    marginTop: spacing.md,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  message: {
    marginTop: spacing.sm,
    color: C.grey,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
