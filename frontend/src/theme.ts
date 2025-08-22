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