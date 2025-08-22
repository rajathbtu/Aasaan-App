import { colors } from '../theme';

export interface LanguageOption {
  color: string | undefined;
  icon: string;
  subLabel: string;
  code: string;
  label: string; // English label
  nativeLabel?: string; // Endonym
}

export const languages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', color: colors.infoLight, icon: 'E', subLabel: 'EN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', color: '#FFCC80', icon: 'ह', subLabel: 'HI' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', color: '#C8E6C9', icon: 'ગ', subLabel: 'GU' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', color: '#D1C4E9', icon: 'म', subLabel: 'MR' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', color: '#FFCDD2', icon: 'த', subLabel: 'TA' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', color: colors.primaryLight, icon: 'త', subLabel: 'TE' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', color: '#FFF9C4', icon: 'ಕ', subLabel: 'KN' },
];

export const getLanguageDisplay = (code: string) => {
  const lang = languages.find(l => l.code === code);
  if (!lang) return code;
  if (!lang.nativeLabel || lang.nativeLabel === lang.label) return lang.label;
  return `${lang.nativeLabel} / ${lang.label}`;
};