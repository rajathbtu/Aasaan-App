import type { ViewStyle } from 'react-native';

// Centralised theme definitions for colours, spacing and other constants.
// This file centralises colour palette and common spacing values used
// throughout the application to ensure a consistent look and feel.  If you
// need to tweak the visual style of the app simply adjust values here
// without hunting through individual screens.

export const colors = {
  /** Primary brand colour used for buttons and highlights. */
  primary: '#00B878',
  /** Secondary action colour, often used for success or positive actions. */
  secondary: '#008F63',
  /** Accent colour used sparingly for call‑out elements. */
  accent: '#0EA5A4',
  /** Neutral very light background colour. */
  light: '#F9FAFB',
  /** Default screen background colour. */
  background: '#f6f6f6',
  /** Slightly different neutral surface (e.g. cards) */
  paper: '#f8fafc',
  /** Surface background for chips, pills, subtle containers. */
  surface: '#F3F8F5',
  /** Pure white */
  white: '#ffffff',
  /** Pure black */
  black: '#000000',
  /** Dark text colour for headings. */
  dark: '#202B27',
  /** Medium grey for secondary text. */
  grey: '#6b7280',
  /** Muted grey for placeholders and hints. */
  greyMuted: '#9ca3af',
  /** Light grey for borders and backgrounds. */
  greyLight: '#e5e7eb',
  /** Subtle border grey */
  greyBorder: '#d1d5db',
  /** Lighter primary tints for backgrounds */
  primaryLight: '#DDF8EC',
  primarySoft: '#F0FBF6',
  /** Primary border/tint */
  primaryBorder: '#A7E8CB',
  /** Info/light blue background tint */
  infoLight: '#e0f2fe',
  /** Error colour for destructive or negative actions. */
  error: '#ef4444',
  /** Warning/alert colour used occasionally. */
  warning: '#facc15',
  /** Light warning tint for badges and subtle backgrounds. */
  warningLight: '#fef3c7',
  /** Success colour for completed tasks. */
  success: '#00B878',
  /** Dark success colour for high-emphasis positive actions. */
  successDark: '#008F63',
  /** Success light background tint */
  successLight: '#DDF8EC',
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


/**
 * Consumer home design tokens — sampled from the approved Consumer_Home_Handoff
 * design so the consumer home screen (and future consumer pages) share one
 * consistent visual system: primary green #079B60, dark green #07864F, mint
 * #E8F8F0, selected mint #DDF7EA, page #F7FCF9, ink #172B2A, muted #727D89.
 */
export const consumerColors = {
  /** Primary brand green (wordmark, active states, accents). */
  primary: '#079B60',
  /** Darker green for active chip text / view-all / deep accents. */
  primaryDark: '#07864F',
  /** Soft mint tint for chip bubbles, selected chip backgrounds, unread tiles. */
  mint: '#E8F8F0',
  /** Selected chip background and active bottom-tab bubble. */
  selectedMint: '#DDF7EA',
  /** Page / screen background. */
  page: '#F7FCF9',
  /** Primary heading / body text. */
  ink: '#172B2A',
  /** Secondary / helper / placeholder text. */
  muted: '#727D89',
  /** Pure white surface. */
  white: '#FFFFFF',
  /** Default card / search / chip border. */
  border: '#edf2ef',
  /** Service card border. */
  serviceBorder: '#edf1ef',
  /** Subtle lift colour for shadows (green-tinted). */
  shadowTint: '#1a4331',
  /** Category group heading marker (vertical bar). */
  groupMarker: '#10b879',
  /** Service bubble pastel tints (cyan / slate / rose / blue / violet / orange). */
  bubbleCyanBg: '#e4f8fa',
  bubbleCyanBorder: '#bde8ec',
  bubbleCyanStroke: '#08a7b8',
  bubbleSlateBg: '#f0f4f5',
  bubbleSlateBorder: '#dce4e7',
  bubbleSlateStroke: '#8195a0',
  bubbleRoseBg: '#fdecee',
  bubbleRoseBorder: '#f5d6d9',
  bubbleRoseStroke: '#d92f3b',
  bubbleBlueBg: '#eaf3ff',
  bubbleBlueBorder: '#d6e6ff',
  bubbleBlueStroke: '#268fe7',
  bubbleVioletBg: '#f3ecff',
  bubbleVioletBorder: '#e5d9ff',
  bubbleVioletStroke: '#8d4de8',
  bubbleOrangeBg: '#fff2e7',
  bubbleOrangeBorder: '#ffe0c5',
  bubbleOrangeStroke: '#f08a19',

  /** Work request detail — Boost request tile (warm amber). */
  boostBg: '#FFF3E2',
  boostBorder: '#FFE0B7',
  boostText: '#C84900',
  /** Work request detail — Close request tile (soft red). */
  closeBg: '#FFF0F1',
  closeBorder: '#FFD7DA',
  closeText: '#C31820',
  /** Work request detail — Active status pill. */
  statusBg: '#E1F8EB',
  statusText: '#078D4E',
  statusDot: '#08B83F',
  /** Work request detail — request location panel surface. */
  locationBg: '#E4F8EE',
  /** Pale-blue service thumbnail square (My Requests + Boost approved designs). */
  serviceArtBg: '#D9EDF8',
  /** Boost payment option — selected surface gradient + idle radio ring. */
  paymentSelectedBg: '#E9FAF1',
  paymentSelectedBgEnd: '#F3FCF7',
  radioIdle: '#9AA6B5',
  /** Boost payment option — credit-points pill (unselected style). */
  pointsPillBg: '#EEF1F5',
  pointsPillText: '#687486',
  /** Boost hero panel gradient (approved Boost_Request_Handoff). */
  heroMintStart: '#DDF8EB',
  heroMintMid: '#E4FAF5',
  heroMintEnd: '#C8F4DF',
} as const;

/** Font families available to consumer screens (Inter is loaded in App.tsx). */
export const consumerFonts = {
  regular: 'Inter',
  bold: 'Inter-Bold',
} as const;

/** Consumer typography scale, matched to the approved design. */
export const consumerTypography = {
  wordmark: { fontSize: 35, fontWeight: '800' as const, letterSpacing: -1.8, lineHeight: 1.1 },
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 1.17 },
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 1.45 },
  section: { fontSize: 23, fontWeight: '600' as const, letterSpacing: -0.6 },
  group: { fontSize: 19, fontWeight: '600' as const },
  service: { fontSize: 15, fontWeight: '500' as const, lineHeight: 1.35 },
  chip: { fontSize: 14, fontWeight: '500' as const },
  searchInput: { fontSize: 16 },
  location: { fontSize: 15 },
  viewAll: { fontSize: 13, fontWeight: '700' as const },
  navLabel: { fontSize: 13, fontWeight: '600' as const },
} as const;

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