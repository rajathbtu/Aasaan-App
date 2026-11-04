/**
 * Light + dark palettes for the whole app.
 *
 * The app historically had three token families, each keyed the same way in
 * light mode. To keep light mode pixel-identical, each family keeps its own
 * light values and gains a matching dark counterpart:
 *
 *  - `base`     — the original global `colors` from theme.ts, plus every
 *                 shared token used by the auth/onboarding screens
 *                 (LanguageSelection, LocationSelect, MobileInput, NameOTP,
 *                 RoleSelect, SPSelectServices, OtpInput).
 *  - `consumer` — the Consumer handoff tokens (consumerColors), plus the
 *                 WorkRequest details tokens.
 *  - `profile`  — the Profile handoff tokens (profileColors), plus the
 *                 Notifications tokens.
 *
 * Rules for dark values:
 *  - Page/canvas surfaces: deep green-tinted charcoal (#0D1412 family).
 *  - Cards/sheets: #16211C; elevated inputs: #1C2723.
 *  - Primary text #E8EFEA, secondary #A6B3AB, tertiary/placeholder #7E8C84 —
 *    all ≥ 4.5:1 on card/page surfaces (verified by scripts/contrast-audit.mjs).
 *  - Green used as TEXT or icons on dark surfaces brightens to #3DD68C;
 *    green used as a FILLED button keeps the brand gradient and pairs with
 *    `onPrimary` (white) text.
 *  - `white` flips to the dark CARD surface (#16211C) because that is its
 *    dominant use (container backgrounds). Text sitting ON a colored fill
 *    must use `onPrimary` instead. Soft pastel tints (mint/purple/red pills)
 *    map to dark desaturated tints of the same hue.
 */

/* ------------------------------------------------------------------ */
/* Base family (global `colors` + shared auth/onboarding tokens)       */
/* ------------------------------------------------------------------ */

const baseLight = {
  // — original theme.ts colors (values unchanged) —
  primary: '#00B878',
  secondary: '#008F63',
  accent: '#0EA5A4',
  light: '#F9FAFB',
  background: '#f6f6f6',
  paper: '#f8fafc',
  surface: '#F3F8F5',
  white: '#ffffff',
  black: '#000000',
  dark: '#202B27',
  grey: '#6b7280',
  greyMuted: '#9ca3af',
  greyLight: '#e5e7eb',
  greyBorder: '#d1d5db',
  primaryLight: '#DDF8EC',
  primarySoft: '#F0FBF6',
  primaryBorder: '#A7E8CB',
  infoLight: '#e0f2fe',
  error: '#ef4444',
  warning: '#facc15',
  warningLight: '#fef3c7',
  success: '#00B878',
  successDark: '#008F63',
  successLight: '#DDF8EC',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  violetStrong: '#a855f7',
  // — shared brand greens used across handoff screens —
  brand: '#079B60',
  brandDark: '#07864F',
  brandDeep: '#008B52',
  brandBright: '#0CBD7B',
  brand2: '#00A86B',
  green2: '#08AD73',
  // — surfaces & neutrals (LanguageSelection / MobileInput / NameOTP) —
  canvas: '#FBFCFD',
  field: '#F1F2F5',
  fieldBorder: '#D9E0E3',
  placeholder: '#9AA4B2',
  line: '#DFE5E8',
  divider: '#D6DBE1',
  topbarLine: '#EEF1EF',
  footerBorder: '#E8ECEF',
  headerBorder: '#F0F2F1',
  selectionBorder: '#D4D9DF',
  // — mint tints —
  mintStrong: '#D9F5E7',
  backBg: '#E8F8EF',
  pillBg: '#E9F8F0',
  selectedBg: '#F0FBF5',
  greenSoft: '#E7F9ED',
  greenSelected: '#EFFBF3',
  mintButton: '#EFF9F3',
  selectedSurface: '#EDFBF3',
  // — SPSelectServices specifics —
  selectionHeadingText: '#073F24',
  sectionAccent: '#0AAE70',
  serviceName: '#101714',
  tabText: '#161D19',
  chipText: '#17231B',
  searchBorder: '#E1E6E3',
  searchPlaceholder: '#8B929A',
  tabBorder: '#E6EBE8',
  cardBorder: '#E0E8E5',
  // — RoleSelect specifics —
  benefitTile: '#E4F8ED',
  benefitText: '#18231E',
  labelBg: '#E8F8EE',
  labelGreen: '#087F50',
  radioBorder: '#AEB9C0',
  hint: '#89938F',
  // — LocationSelect specifics —
  radiusBtnBorder: '#DCE2E8',
  radiusBtnText: '#26313A',
  currentLocBorder: '#C9F1DF',
  currentLocBg: '#EAF9F2',
  currentLocText: '#078B54',
  iconTileBg: '#E2F8EE',
  mapBg: '#F3F7F5',
  // — MobileInput / NameOTP specifics —
  secureText: '#46525F',
  danger: '#D04444',
  dangerText: '#C33B45',
  dangerSoft: '#FDECEC',
  termsText: '#6B7280',
  socialBorder: '#CFE8DA',
  socialIconBg: '#DCF6E8',
  socialWave: '#D0F5E4',
  pageWave: '#EAF7F0',
  // — misc shared —
  skeletonBlock: '#E5E7EB',
  // — premium violet family (Pro banners / subscription hero) —
  // The violet gradient/glow is a filled brand surface: it never flips with
  // the mode, so both palettes pin the same hexes.
  violetDeep: '#7c3aed',
  violetDark: '#6e1cc4',
  proGradientStart: '#a84cf1',
  proGradientMid: '#8429dc',
  proGradientEnd: '#6e1cc4',
  // — Pro banners' inverted (white-on-violet) surfaces: pinned light in
  // both modes so their text keeps contrast on the violet fill. —
  proBenefitBg: '#ffffff',
  proPillBg: '#ffffff',
  // — map loading veil (binary light/dark value; the dark side mirrors `scrim`) —
  mapLoadingVeil: 'rgba(255,255,255,0.85)',
  tintPurpleSoft: '#f5f3ff',
  tintBlueSoft: '#eff6ff',
  tintGreenSoft: '#ecfdf5',
  tintOrangeSoft: '#ffedd5',
  tintAmberSoft: '#fffbeb',
  // — cross-mode helpers —
  /** Text/icons sitting on a primary/brand-colored fill. */
  onPrimary: '#FFFFFF',
  /** onPrimary at ~88% alpha — secondary text on filled brand surfaces. */
  onPrimarySoft: 'rgba(255,255,255,0.88)',
  /** onPrimary at 90% alpha — active count text on filled tabs. */
  onPrimary90: 'rgba(255,255,255,0.9)',
  /** Translucent white glass on filled brand surfaces (chips/tiles). */
  proGlass: 'rgba(255,255,255,0.22)',
  /** Translucent white border on filled brand surfaces. */
  proGlassBorder: 'rgba(255,255,255,0.35)',
  /** Off-state track for the dark-mode Switch (light mode: #D8DFDB;
   * dark mode: follows the greyBorder family — use greyBorder instead). */
  switchOff: '#D8DFDB',
  /** Floating toast background — pinned dark in BOTH modes (mode-invariant
   * overlay: the toast is always a charcoal pill with white text, see
   * ToastContext). Do not flip this with the mode. */
  toastBg: '#1F2937',
  /** Modal / sheet backdrop. */
  scrim: 'rgba(17, 24, 39, 0.5)',
  /** Container behind photos/illustrations. */
  imageBg: '#FFFFFF',
} as const;

const baseDark: Record<keyof typeof baseLight, string> = {
  primary: '#00A168',
  secondary: '#00A06C',
  accent: '#17C0BE',
  light: '#1A2420',
  background: '#0D1412',
  paper: '#141D19',
  surface: '#16211C',
  white: '#16211C',
  black: '#000000',
  dark: '#E8EFEA',
  grey: '#A6B3AB',
  greyMuted: '#7E8C84',
  greyLight: '#2A3630',
  greyBorder: '#3A4A42',
  primaryLight: '#12301F',
  primarySoft: '#142C20',
  primaryBorder: '#245C41',
  infoLight: '#12283A',
  error: '#FF6B6B',
  warning: '#FFC24B',
  warningLight: '#332B12',
  success: '#00A168',
  successDark: '#00A06C',
  successLight: '#12301F',
  amber: '#F0A32B',
  violet: '#A78BFA',
  violetStrong: '#B78BFF',
  brand: '#00A168',
  brandDark: '#3DD68C',
  brandDeep: '#00A06C',
  brandBright: '#2FD08B',
  brand2: '#00A168',
  green2: '#00A168',
  canvas: '#101A16',
  field: '#1C2723',
  fieldBorder: '#33413B',
  placeholder: '#7E8C84',
  line: '#2A3630',
  divider: '#2E3B35',
  topbarLine: '#232E29',
  footerBorder: '#232E29',
  headerBorder: '#202B26',
  selectionBorder: '#33413B',
  mintStrong: '#17402A',
  backBg: '#12281D',
  pillBg: '#12281D',
  selectedBg: '#142E20',
  greenSoft: '#12281D',
  greenSelected: '#142E20',
  mintButton: '#12281D',
  selectedSurface: '#142E20',
  selectionHeadingText: '#7EE0AE',
  sectionAccent: '#0ABF77',
  serviceName: '#E8EFEA',
  tabText: '#E8EFEA',
  chipText: '#DDE7E1',
  searchBorder: '#2A3630',
  searchPlaceholder: '#7E8C84',
  tabBorder: '#26332D',
  cardBorder: '#26332D',
  benefitTile: '#142E20',
  benefitText: '#DDE7E1',
  labelBg: '#12281D',
  labelGreen: '#3DD68C',
  radioBorder: '#55645D',
  hint: '#7E8C84',
  radiusBtnBorder: '#33413B',
  radiusBtnText: '#C9D4CD',
  currentLocBorder: '#245C41',
  currentLocBg: '#12281D',
  currentLocText: '#3DD68C',
  iconTileBg: '#142E20',
  mapBg: '#1A2420',
  secureText: '#A6B3AB',
  danger: '#E5484D',
  dangerText: '#FF7A7A',
  dangerSoft: '#33191B',
  termsText: '#9AA8A0',
  socialBorder: '#245C41',
  socialIconBg: '#142E20',
  socialWave: '#143525',
  pageWave: '#10241A',
  skeletonBlock: '#232E29',
  // — premium violet family: filled brand surface, pinned in both modes —
  violetDeep: '#7c3aed',
  violetDark: '#6e1cc4',
  proGradientStart: '#a84cf1',
  proGradientMid: '#8429dc',
  proGradientEnd: '#6e1cc4',
  // — Pro banners' inverted (white-on-violet) surfaces: pinned light in
  // both modes so their text keeps contrast on the violet fill. —
  proBenefitBg: '#ffffff',
  proPillBg: '#ffffff',
  /** Dark side of the map loading veil — mirrors `scrim` below. */
  mapLoadingVeil: 'rgba(0, 0, 0, 0.65)',
  tintPurpleSoft: '#241A3A',
  tintBlueSoft: '#12283A',
  tintGreenSoft: '#12281D',
  tintOrangeSoft: '#33200E',
  tintAmberSoft: '#332B12',
  onPrimary: '#FFFFFF',
  onPrimarySoft: 'rgba(255,255,255,0.88)',
  onPrimary90: 'rgba(255,255,255,0.9)',
  proGlass: 'rgba(255,255,255,0.22)',
  proGlassBorder: 'rgba(255,255,255,0.35)',
  switchOff: '#3A4A42',
  /** Pinned to the same charcoal as light mode — the toast is mode-invariant. */
  toastBg: '#1F2937',
  scrim: 'rgba(0, 0, 0, 0.65)',
  imageBg: '#1C2723',
};

export type BasePalette = Record<keyof typeof baseLight, string>;

/* ------------------------------------------------------------------ */
/* Consumer family (consumerColors + WorkRequest details tokens)       */
/* ------------------------------------------------------------------ */

const consumerLight = {
  // — original consumerColors (values unchanged) —
  primary: '#079B60',
  primaryDark: '#07864F',
  mint: '#E8F8F0',
  selectedMint: '#DDF7EA',
  page: '#F7FCF9',
  ink: '#172B2A',
  muted: '#727D89',
  white: '#FFFFFF',
  border: '#edf2ef',
  serviceBorder: '#edf1ef',
  shadowTint: '#1a4331',
  groupMarker: '#10b879',
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
  boostBg: '#FFF3E2',
  boostBorder: '#FFE0B7',
  boostText: '#C84900',
  closeBg: '#FFF0F1',
  closeBorder: '#FFD7DA',
  closeText: '#C31820',
  statusBg: '#E3F8EC',
  statusText: '#07864B',
  statusDot: '#08A84D',
  locationBg: '#E4F8EE',
  serviceArtBg: '#D9EDF8',
  tabTrack: '#EAF0F3',
  tabActiveStart: '#079E5C',
  tabActiveEnd: '#087B48',
  requestAccentGreen: '#63CF5D',
  requestAccentBlue: '#47C7EF',
  requestAccentAmber: '#FFB63D',
  requestArtMint: '#E8F8F0',
  cardTitle: '#111B35',
  cardCategory: '#657181',
  cardMeta: '#5D6879',
  stripDefaultStart: '#F3F5F9',
  stripDefaultEnd: '#F7F8FA',
  stripBlueStart: '#F2F7FB',
  stripBlueEnd: '#EFF8F8',
  stripAmberStart: '#F7F5FA',
  stripAmberEnd: '#F3F2FA',
  ctaStart: '#079D5B',
  ctaEnd: '#057A45',
  paymentSelectedBg: '#E9FAF1',
  paymentSelectedBgEnd: '#F3FCF7',
  radioIdle: '#9AA6B5',
  pointsPillBg: '#EEF1F5',
  pointsPillText: '#687486',
  heroMintStart: '#DDF8EB',
  heroMintMid: '#E4FAF5',
  heroMintEnd: '#C8F4DF',
  // — absorbed from WorkRequestDetailsScreen —
  mintDeep: '#DDF8EC',
  deepGreen: '#078C4B',
  iconEdit: '#168BE5',
  /** Approved design renders the Share tile icon violet. */
  iconShare: '#7C3AED',
  iconClose: '#D31D24',
  filterBorder: '#E1E8F0',
  filterText: '#39465B',
  listBorder: '#E9EEF3',
  rowBorder: '#E8EDF2',
  metaInk: '#263449',
  respGreenBg: '#E4F8EC',
  respGreenText: '#087E45',
  respBlueBg: '#E6F2FF',
  respBlueText: '#17569A',
  respPurpleBg: '#F1E8FF',
  respPurpleText: '#6D28C7',
  acceptStart: '#079B53',
  acceptEnd: '#07864B',
  acceptedBg: '#E2F6EB',
  acceptedText: '#087E45',
  profileBorder: '#DCE4EB',
  profileBg: '#F8FAFC',
  profileText: '#172238',
  verifiedBg: '#00B95D',
  star: '#F5A800',
  onlineDot: '#00B85A',
  // — absorbed from AadhaarOfflineEkycScreen —
  inputBorder: '#D5DDE3',
  consentBg: '#F0FAF5',
  errorText: '#C43D3D',
  // — misc —
  skeletonBlock: '#E5E7EB',
  /** Text/icons sitting on a primary/brand-colored fill. */
  onPrimary: '#FFFFFF',
  /** Modal / sheet backdrop. */
  scrim: 'rgba(17, 24, 39, 0.5)',
} as const;

const consumerDark: Record<keyof typeof consumerLight, string> = {
  primary: '#00A168',
  primaryDark: '#3DD68C',
  mint: '#12281D',
  selectedMint: '#17402A',
  page: '#0D1412',
  ink: '#E8EFEA',
  muted: '#A6B3AB',
  white: '#16211C',
  border: '#26332D',
  serviceBorder: '#26332D',
  shadowTint: '#000000',
  groupMarker: '#2FD08B',
  bubbleCyanBg: '#0E2E33',
  bubbleCyanBorder: '#1B4A52',
  bubbleCyanStroke: '#3ECBD8',
  bubbleSlateBg: '#1E272B',
  bubbleSlateBorder: '#39474E',
  bubbleSlateStroke: '#8FA6B2',
  bubbleRoseBg: '#36161A',
  bubbleRoseBorder: '#57262C',
  bubbleRoseStroke: '#FF6B74',
  bubbleBlueBg: '#0F2540',
  bubbleBlueBorder: '#1E3E66',
  bubbleBlueStroke: '#5AA9FF',
  bubbleVioletBg: '#241536',
  bubbleVioletBorder: '#3E2A5C',
  bubbleVioletStroke: '#B78BFF',
  bubbleOrangeBg: '#33200E',
  bubbleOrangeBorder: '#573517',
  bubbleOrangeStroke: '#FFA04D',
  boostBg: '#2E2110',
  boostBorder: '#4A3714',
  boostText: '#FFB74D',
  closeBg: '#331418',
  closeBorder: '#522A30',
  closeText: '#FF7A80',
  statusBg: '#12301F',
  statusText: '#3DD68C',
  statusDot: '#2FD08B',
  locationBg: '#12281D',
  serviceArtBg: '#1A2E38',
  tabTrack: '#1E2925',
  tabActiveStart: '#00A168',
  tabActiveEnd: '#089B54',
  requestAccentGreen: '#5FD868',
  requestAccentBlue: '#5FCBFF',
  requestAccentAmber: '#FFC05C',
  requestArtMint: '#142E20',
  cardTitle: '#EDF2F7',
  cardCategory: '#9AA8B5',
  cardMeta: '#8C99A6',
  stripDefaultStart: '#1C2622',
  stripDefaultEnd: '#1E2926',
  stripBlueStart: '#1B2830',
  stripBlueEnd: '#18262B',
  stripAmberStart: '#221F26',
  stripAmberEnd: '#1F1D24',
  ctaStart: '#00A168',
  ctaEnd: '#089B54',
  paymentSelectedBg: '#12301F',
  paymentSelectedBgEnd: '#143626',
  radioIdle: '#55645D',
  pointsPillBg: '#232E29',
  pointsPillText: '#A6B3AB',
  heroMintStart: '#0F2C1E',
  heroMintMid: '#10302A',
  heroMintEnd: '#0D3A26',
  mintDeep: '#17402A',
  deepGreen: '#0ABF77',
  iconEdit: '#4DA3FF',
  iconShare: '#A78BFA',
  iconClose: '#FF5A5A',
  filterBorder: '#2A3630',
  filterText: '#C9D4CD',
  listBorder: '#232E29',
  rowBorder: '#232E29',
  metaInk: '#C9D4CD',
  respGreenBg: '#12301F',
  respGreenText: '#3DD68C',
  respBlueBg: '#12283A',
  respBlueText: '#6BB8FF',
  respPurpleBg: '#241A3A',
  respPurpleText: '#B493FF',
  acceptStart: '#00A168',
  acceptEnd: '#089B54',
  acceptedBg: '#12301F',
  acceptedText: '#3DD68C',
  profileBorder: '#2A3630',
  profileBg: '#1C2723',
  profileText: '#DDE7E1',
  verifiedBg: '#00A168',
  star: '#FFC24B',
  onlineDot: '#2FD08B',
  inputBorder: '#33413B',
  consentBg: '#12281D',
  errorText: '#FF7A7A',
  skeletonBlock: '#232E29',
  onPrimary: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.65)',
};

export type ConsumerPalette = Record<keyof typeof consumerLight, string>;

/* ------------------------------------------------------------------ */
/* Profile family (profileColors + Notifications tokens)               */
/* ------------------------------------------------------------------ */

const profileLight = {
  // — original theme/profile.ts profileColors (values unchanged) —
  primary: '#079B65',
  primaryDark: '#087B50',
  primarySoft: '#EAF8F1',
  page: '#F6F8F7',
  ink: '#202B28',
  muted: '#6B7772',
  border: '#E5EBE8',
  purple: '#873EE5',
  purpleInk: '#5721A2',
  purpleSoft: '#F9F5FF',
  purpleBorder: '#E6D4FF',
  purpleDivider: '#E4D3F8',
  purplePrice: '#6A2AB1',
  danger: '#DC4545',
  dangerText: '#C53B3B',
  dangerSoft: '#FFF0EF',
  dangerInk: '#A43B35',
  trail: '#7B8782',
  rowIconBg: '#F0F8F3',
  statBg: '#F9FBFA',
  check: '#0CA66D',
  version: '#9AA39F',
  purpleBadgeSoft: '#EADBFF',
  purpleBadgeInk: '#6D2BB5',
  purpleMuted: '#746B80',
  white: '#FFFFFF',
  // — ProfileScreen hero / chips —
  heroBg: '#F2FBF6',
  heroBorder: '#E6F4EC',
  chipGreen: '#176C4C',
  // — absorbed from NotificationsScreen —
  unreadTint: '#F3FCF6',
  unreadBorder: '#D9F0E2',
  countBg: '#E3F6EB',
  desc: '#59645F',
  sheetDesc: '#56615B',
  sheetCloseBg: '#F2F6F3',
  markBorder: '#D7EEE1',
  markBg: '#E8F8F0',
  markText: '#087B50',
  skeletonBlock: '#E5E7EB',
  // — cross-mode helpers —
  /** Text/icons sitting on a primary/brand-colored fill. */
  onPrimary: '#FFFFFF',
  /** Modal / sheet backdrop. */
  scrim: 'rgba(17, 24, 39, 0.5)',
  /** Dark-mode Switch off-track (ProfileScreen). */
  switchOff: '#D8DFDB',
} as const;

const profileDark: Record<keyof typeof profileLight, string> = {
  primary: '#00A168',
  primaryDark: '#3DD68C',
  primarySoft: '#12281D',
  page: '#0D1412',
  ink: '#E8EFEA',
  muted: '#A6B3AB',
  border: '#26332D',
  purple: '#A78BFA',
  purpleInk: '#C4A9F5',
  purpleSoft: '#241A3A',
  purpleBorder: '#3E2A5C',
  purpleDivider: '#382A50',
  purplePrice: '#C9A9FF',
  danger: '#FF6B6B',
  dangerText: '#FF7A7A',
  dangerSoft: '#33191B',
  dangerInk: '#FF8A8A',
  trail: '#7E8C84',
  rowIconBg: '#142E20',
  statBg: '#1C2723',
  check: '#2FD08B',
  version: '#7E8C84',
  purpleBadgeSoft: '#2E1F49',
  purpleBadgeInk: '#C9A9FF',
  purpleMuted: '#A99BB8',
  white: '#16211C',
  heroBg: '#12241A',
  heroBorder: '#1F3A2C',
  chipGreen: '#7FDCA8',
  unreadTint: '#122419',
  unreadBorder: '#245C41',
  countBg: '#12301F',
  desc: '#A6B3AB',
  sheetDesc: '#A6B3AB',
  sheetCloseBg: '#232E29',
  markBorder: '#245C41',
  markBg: '#12281D',
  markText: '#3DD68C',
  skeletonBlock: '#232E29',
  onPrimary: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.65)',
  switchOff: '#3A4A42',
};

export type ProfilePalette = Record<keyof typeof profileLight, string>;

/* ------------------------------------------------------------------ */
/* Exported palette sets                                               */
/* ------------------------------------------------------------------ */

export const basePalettes = {
  light: baseLight as BasePalette,
  dark: baseDark,
};
export const consumerPalettes = {
  light: consumerLight as ConsumerPalette,
  dark: consumerDark,
};
export const profilePalettes = {
  light: profileLight as ProfilePalette,
  dark: profileDark,
};

/* ------------------------------------------------------------------ */
/* Google Maps dark style (for react-native-maps customMapStyle)       */
/* ------------------------------------------------------------------ */

/** Green-tinted dark map matching the app's dark surfaces. */
export const DARK_MAP_STYLE: Array<Record<string, string | Array<Record<string, string>>>> = [
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1412' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a6b3ab' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#16201c' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#141d19' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#18241f' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#12281f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#5f8a72' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3630' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c2723' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33413b' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#242f2a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#22302a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f2530' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5f7a86' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#33413b' }] },
];
