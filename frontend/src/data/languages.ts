export interface LanguageOption {
  color: string | undefined;
  icon: string;
  subLabel: string;
  code: string;
  label: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', label: 'English', color: 'blue', icon: '🇬🇧', subLabel: 'EN' },
  { code: 'hi', label: 'Hindi', color: 'orange', icon: '🇮🇳', subLabel: 'HI' },
  { code: 'gu', label: 'Gujarati', color: 'green', icon: '🇮🇳', subLabel: 'GU' },
  { code: 'mr', label: 'Marathi', color: 'purple', icon: '🇮🇳', subLabel: 'MR' },
  { code: 'ta', label: 'Tamil', color: 'red', icon: '🇮🇳', subLabel: 'TA' },
  { code: 'te', label: 'Telugu', color: 'blue', icon: '🇮🇳', subLabel: 'TE' },
  { code: 'kn', label: 'Kannada', color: 'yellow', icon: '🇮🇳', subLabel: 'KN' },
];