import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, type Theme as NavTheme } from '@react-navigation/native';
import {
  basePalettes,
  consumerPalettes,
  profilePalettes,
  DARK_MAP_STYLE,
  type BasePalette,
  type ConsumerPalette,
  type ProfilePalette,
} from '../theme/palette';

/** App appearance mode — controlled by the Profile → Dark mode switch. */
export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'aasaan_theme_mode';

type ThemeContextValue = {
  /** Current appearance mode. Defaults to light until persisted value loads. */
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  /** Global `colors` family (theme.ts tokens + shared onboarding tokens). */
  base: BasePalette;
  /** Consumer handoff tokens (consumerColors). */
  consumer: ConsumerPalette;
  /** Profile handoff tokens (profileColors). */
  profile: ProfilePalette;
  /** React Navigation theme matching the current mode. */
  navTheme: NavTheme;
  /** Google Maps style array matching the current mode. */
  mapStyle: typeof DARK_MAP_STYLE;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const buildNavTheme = (isDark: boolean): NavTheme => {
  if (isDark) {
    const c = consumerPalettes.dark;
    return {
      ...(DarkTheme as NavTheme),
      dark: true,
      colors: {
        ...DarkTheme.colors,
        primary: c.primary,
        background: c.page,
        card: c.white,
        text: c.ink,
        border: c.border,
        notification: c.primary,
      },
    };
  }
  const c = consumerPalettes.light;
  return {
    ...(DefaultTheme as NavTheme),
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: c.primary,
      background: c.page,
      card: c.white,
      text: c.ink,
      border: c.border,
      notification: c.primary,
    },
  };
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Restore the persisted mode once on mount.
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (mounted && (stored === 'light' || stored === 'dark')) {
          setModeState(stored);
        }
      })
      .catch(() => {
        // Corrupted/unavailable storage — keep the light default.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const isDark = mode === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark,
      setMode,
      toggleMode,
      base: basePalettes[mode],
      consumer: consumerPalettes[mode],
      profile: profilePalettes[mode],
      navTheme: buildNavTheme(isDark),
      mapStyle: isDark ? DARK_MAP_STYLE : [],
    }),
    [mode, isDark, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

/** Convenience hook for components that only need the dark flag. */
export const useIsDark = (): boolean => useTheme().isDark;
