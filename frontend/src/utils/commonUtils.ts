type Translate = (key: string, vars?: Record<string, string | number>) => string;

export type TimeAgoOptions = {
  absoluteAfterDays?: number;
};

export function buildTimeAgo(t: Translate, options: TimeAgoOptions = {}) {
  return (value: any): string => {
    if (!value) return t('common.relative.justNow');
    const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    const time = date?.getTime?.() || 0;
    const diff = Date.now() - time;
    if (!Number.isFinite(diff) || diff < 0) return t('common.relative.justNow');

    const absoluteAfterDays = options.absoluteAfterDays;
    if (absoluteAfterDays != null && diff >= absoluteAfterDays * 24 * 60 * 60 * 1000) {
      return new Date(time).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('common.relative.justNow');
    if (minutes < 60) return t('common.relative.minAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('common.relative.hourAgo', { count: hours });
    return t('common.relative.dayAgo', { count: Math.floor(hours / 24) });
  };
}

/** Computes the distance between two latitude/longitude pairs in kilometres. */
export const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earthRadius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};