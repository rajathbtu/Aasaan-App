import { useMemo } from 'react';
import { translations, SupportedLocale } from './translations';
import { useAuth } from '../contexts/AuthContext';

function get(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj);
}

export function useI18n(preferred?: string) {
  const { user } = useAuth();
  const lang = (preferred || user?.language || 'en') as SupportedLocale;
  const dict = translations[lang] || translations.en;
  const fallback = translations.en;

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      let val = get(dict, key) ?? get(fallback, key) ?? key;
      if (typeof val === 'string' && vars) {
        Object.keys(vars).forEach(k => {
          val = (val as string).replace(new RegExp(`{${k}}`, 'g'), String(vars[k]));
        });
      }
      return String(val);
    };
  }, [dict, fallback]);

  return { t, lang };
}
