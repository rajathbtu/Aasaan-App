import type { ViewStyle } from 'react-native';

// Centralised theme definitions for colours, spacing and other constants.
// This file centralises colour palette and common spacing values used
// throughout the application to ensure a consistent look and feel.  If you
// need to tweak the visual style of the app simply adjust values here
// without hunting through individual screens.

export const colors = {
  /** Primary brand colour used for buttons and highlights. */
  primary: '#2563eb',
  /** Secondary action colour, often used for success or positive actions. */
  secondary: '#10b981',
  /** Accent colour used sparingly for call‑out elements. */
  accent: '#f97316',
  /** Neutral very light background colour. */
  light: '#f9fafb',
  /** Slightly different neutral surface (e.g. cards) */
  paper: '#f8fafc',
  /** Surface background for chips, pills, subtle containers. */
  surface: '#f3f4f6',
  /** Pure white */
  white: '#ffffff',
  /** Pure black */
  black: '#000000',
  /** Dark text colour for headings. */
  dark: '#1f2937',
  /** Medium grey for secondary text. */
  grey: '#6b7280',
  /** Muted grey for placeholders and hints. */
  greyMuted: '#9ca3af',
  /** Light grey for borders and backgrounds. */
  greyLight: '#e5e7eb',
  /** Subtle border grey */
  greyBorder: '#d1d5db',
  /** Lighter primary tints for backgrounds */
  primaryLight: '#dbeafe',
  primarySoft: '#eef2ff',
  /** Primary border/tint */
  primaryBorder: '#bfdbfe',
  /** Info/light blue background tint */
  infoLight: '#e0f2fe',
  /** Error colour for destructive or negative actions. */
  error: '#ef4444',
  /** Warning/alert colour used occasionally. */
  warning: '#facc15',
  /** Success colour for completed tasks. */
  success: '#10b981',
  /** Success light background tint */
  successLight: '#d1fae5',
  /** Additional brand/support colours */
  amber: '#f59e0b',
  violet: '#8b5cf6',
  violetStrong: '#a855f7',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  /** Slightly larger than md, commonly used for 14px paddings */
  mdPlus: 14,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

export const sizes = {
  /** Right padding to accommodate input adornments (icons/spinners) */
  inputRightPadding: 36,
};

// Common light tints used for cards, chips and category tiles
export const tints = {
  purpleSoft: '#f5f3ff',
  blueSoft: '#eff6ff',
  greenSoft: '#ecfdf5',
  orangeSoft: '#ffedd5',
  amberSoft: '#fffbeb',
};


export const shadows = {
  /** Hairline lift — used for resting cards such as work request cards. */
  sm: {
    boxShadow: '0px 1px 3px rgba(17, 24, 39, 0.05)',
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  /** Default lift for interactive surfaces: grid tiles, search bars, banners. */
  md: {
    boxShadow: '0px 2px 6px rgba(17, 24, 39, 0.06)',
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  /** Stronger lift for floating/hero surfaces. */
  lg: {
    boxShadow: '0px 6px 16px rgba(17, 24, 39, 0.08)',
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  /** Brand tinted glow used to highlight important/active surfaces. */
  focus: {
    boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.18)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;



export const borders = {
  /** Neutral hairline — default for elevated cards. */
  subtle: {
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  /** Slightly darker hairline for denser lists. */
  strong: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  /** Brand tinted edge for selected/active items. */
  accent: {
    borderWidth: 2,
    borderColor: colors.primaryBorder,
  },
  /** Emphasised selection ring (thicker on purpose). */
  selected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
} as const;


export const surfaces = {
  /** Resting card surface: white fill, hairline border, soft shadow. */
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    ...borders.subtle,
    ...shadows.sm,
  },
  /** Grid tile surface: slightly larger radius and a stronger lift. */
  tile: {
    backgroundColor: colors.white,
    borderRadius: radius.xl + 2,
    ...borders.subtle,
    ...shadows.md,
  },
  /** Input/search field surface: pill‑ish radius, soft lift. */
  field: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    ...borders.subtle,
    ...shadows.md,
  },
  /** Accented surface for highlighted/active content (unread rows etc). */
  highlight: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    ...borders.accent,
    ...shadows.sm,
  },
  /** Removes the lift again — useful for skeletons or pressed states. */
  flat: {
    elevation: 0,
    shadowOpacity: 0,
    boxShadow: 'none',
    borderWidth: 0,
  } as ViewStyle,
} satisfies Record<string, ViewStyle>;