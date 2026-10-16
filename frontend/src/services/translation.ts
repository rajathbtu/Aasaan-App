import { transliterateRomanizedHindi } from '../utils/hindiTransliteration';

export async function prepareTargetLanguage(_locale: string): Promise<void> {}

export async function translateText(
  text: string,
  targetLocale: string,
  _sourceLocale?: string,
): Promise<string | null> {
  return targetLocale === 'hi' ? transliterateRomanizedHindi(text.trim()) : null;
}
