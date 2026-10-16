import FastTranslator, { type Languages } from 'fast-mlkit-translate-text';
import { offlineCacheKey, readOfflineCache, writeOfflineCache } from '../utils/offlineCache';
import { transliterateRomanizedHindi } from '../utils/hindiTransliteration';

const languages: Partial<Record<string, Languages>> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  gu: 'Gujarati',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
};

interface CachedTranslation {
  sourceText: string;
  translatedText: string;
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  }
  return (result >>> 0).toString(36);
}

export async function prepareTargetLanguage(locale: string): Promise<void> {
  const target = languages[locale];
  if (!target || await FastTranslator.isLanguageDownloaded(target)) return;

  const downloaded = await FastTranslator.downloadLanguageModel(target);
  if (!downloaded && !await FastTranslator.isLanguageDownloaded(target)) {
    throw new Error(`Unable to download the ${target} translation model.`);
  }
}

export async function translateText(
  text: string,
  targetLocale: string,
  sourceLocale?: string,
): Promise<string | null> {
  const sourceText = text.trim();
  const target = languages[targetLocale];
  if (!sourceText || !target) return null;

  const cacheKey = offlineCacheKey(
    'translations',
    'shared',
    hash(`${sourceLocale || 'auto'}\u0000${targetLocale}\u0000${sourceText}`),
  );
  const applyHindiTransliteration = (translatedText: string | null): string | null => {
    if (targetLocale !== 'hi') return translatedText;
    return transliterateRomanizedHindi(translatedText || sourceText) || translatedText;
  };
  const cached = await readOfflineCache<CachedTranslation>(cacheKey);
  if (cached?.sourceText === sourceText && cached.translatedText) {
    return applyHindiTransliteration(cached.translatedText);
  }

  const sourceTag = sourceLocale ? undefined : await FastTranslator.identify(sourceText);
  const source = sourceLocale
    ? languages[sourceLocale]
    : typeof sourceTag === 'string'
      ? FastTranslator.languageFromTag(sourceTag)
      : undefined;
  if (!source || source === target) return applyHindiTransliteration(null);

  await FastTranslator.prepare({ source, target, downloadIfNeeded: true });
  const result = await FastTranslator.translate(sourceText);
  if (typeof result !== 'string' || !result.trim()) {
    return applyHindiTransliteration(null);
  }

  const translatedText = result.trim();
  const displayText = applyHindiTransliteration(translatedText);
  if (!displayText || displayText === sourceText) return null;

  await writeOfflineCache<CachedTranslation>(cacheKey, { sourceText, translatedText: displayText });
  return displayText;
}
