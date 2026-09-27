import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readOfflineCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeOfflineCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache failures must never prevent the screen from displaying data.
  }
}

export function offlineCacheKey(scope: string, userId: string, id?: string): string {
  return ['offline_cache_v1', scope, userId, id].filter(Boolean).join(':');
}