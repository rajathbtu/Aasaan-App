import { colors } from '../theme';

export interface LanguageOption {
  color: string | undefined;
  icon: string;
  subLabel: string;
  code: string;
  label: string; // English label
  nativeLabel?: string; // Endonym
  /** Tile glyph shown in the language selection card (native syllable / EN). */
  mark: string;
  /** Tile background + glyph colours from the approved handoff reference. */
  markBg: string;
  markFg: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', color: colors.infoLight, icon: 'E', subLabel: 'EN', mark: 'EN', markBg: '#D9F7E9', markFg: '#078B55' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', color: '#FFCC80', icon: 'ह', subLabel: 'HI', mark: 'हि', markBg: '#FFF0D2', markFg: '#916100' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', color: '#C8E6C9', icon: 'ગ', subLabel: 'GU', mark: 'ગુ', markBg: '#DFF7E9', markFg: '#087D50' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', color: '#D1C4E9', icon: 'म', subLabel: 'MR', mark: 'म', markBg: '#EEE5FF', markFg: '#5C4B8A' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', color: '#F8BBD0', icon: 'ব', subLabel: 'BN', mark: 'বা', markBg: '#FFE2EC', markFg: '#A33D65' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', color: '#FFCDD2', icon: 'த', subLabel: 'TA', mark: 'த', markBg: '#FFE8DF', markFg: '#99513A' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', color: colors.primaryLight, icon: 'త', subLabel: 'TE', mark: 'తె', markBg: '#E0F1FE', markFg: '#2F6B9E' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', color: '#FFF9C4', icon: 'ಕ', subLabel: 'KN', mark: 'ಕ', markBg: '#DFF4F8', markFg: '#146C7E' },
];

export const getLanguageDisplay = (code: string) => {
  const lang = languages.find(l => l.code === code);
  if (!lang) return code;
  if (!lang.nativeLabel || lang.nativeLabel === lang.label) return lang.label;
  return `${lang.nativeLabel} / ${lang.label}`;
};
