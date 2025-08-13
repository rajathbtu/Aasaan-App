export interface LanguageOption {
  color: string | undefined;
  icon: string;
  subLabel: string;
  code: string;
  label: string; // English label
  nativeLabel?: string; // Endonym
}

export const languages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', color: 'blue', icon: '🇬🇧', subLabel: 'EN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', color: 'orange', icon: '🇮🇳', subLabel: 'HI' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', color: 'green', icon: '🇮🇳', subLabel: 'GU' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', color: 'purple', icon: '🇮🇳', subLabel: 'MR' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', color: 'red', icon: '🇮🇳', subLabel: 'TA' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', color: 'blue', icon: '🇮🇳', subLabel: 'TE' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', color: 'yellow', icon: '🇮🇳', subLabel: 'KN' },
];

export const getLanguageDisplay = (code: string) => {
  const lang = languages.find(l => l.code === code);
  if (!lang) return code;
  if (!lang.nativeLabel || lang.nativeLabel === lang.label) return lang.label;
  return `${lang.nativeLabel} / ${lang.label}`;
};