/**
 * Design tokens for the Aasaanly profile redesign.
 *
 * Mirrors the approved design so the native screen keeps the approved
 * visual language. Kept separate from the global theme because the profile
 * reference uses a deeper green and a dedicated violet "Professional" family.
 */
export const profileColors = {
  /** Primary action green. */
  primary: '#079B65',
  /** Darker green used for icons on soft green tiles. */
  primaryDark: '#087B50',
  /** Soft green tint for tiles, chips and selected states. */
  primarySoft: '#EAF8F1',
  /** Page background. */
  page: '#F6F8F7',
  /** Primary text. */
  ink: '#202B28',
  /** Secondary text. Slightly darker than the handoff token to keep 12 px text readable. */
  muted: '#6B7772',
  /** Hairline borders and row dividers. */
  border: '#E5EBE8',
  /** Professional plan violet. */
  purple: '#873EE5',
  /** Professional plan heading ink. */
  purpleInk: '#5721A2',
  /** Professional plan card surface. */
  purpleSoft: '#F9F5FF',
  /** Professional plan card border. */
  purpleBorder: '#E6D4FF',
  /** Professional plan footer divider. */
  purpleDivider: '#E4D3F8',
  /** Price label ink. */
  purplePrice: '#6A2AB1',
  /** Destructive red for icons and borders. */
  danger: '#DC4545',
  /** Destructive red for small text (higher contrast). */
  dangerText: '#C53B3B',
  /** Red pill background for "Aadhaar not verified". */
  dangerSoft: '#FFF0EF',
  /** Red pill ink for "Aadhaar not verified". */
  dangerInk: '#A43B35',
  /** Trailing chevron / lock colour. */
  trail: '#7B8782',
  /** Icon tile background inside rows. */
  rowIconBg: '#F0F8F3',
  /** Stat tile background. */
  statBg: '#F9FBFA',
  /** Benefit check circle. */
  check: '#0CA66D',
  /** Version caption. */
  version: '#9AA39F',
  /** Professional badge background / ink. */
  purpleBadgeSoft: '#EADBFF',
  purpleBadgeInk: '#6D2BB5',
  /** Professional subtitle ink. */
  purpleMuted: '#746B80',
  white: '#FFFFFF',
} as const;

export const profileFonts = {
  regular: 'Inter',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;
