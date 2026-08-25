import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { getNotifications } from '../api';
import { useAuth } from './AuthContext';
import { offlineCacheKey, readOfflineCache } from '../utils/offlineCache';

/**
 * Exposes the number of unseen ("unread") notifications shown in the
 * header badge.  Deliberately kept low priority:
 *  - the initial value is computed from the local offline cache (no network)
 *  - network refreshes are debounced, delayed and further deferred until
 *    animations/interactions settle, so they never compete with screen loads
 *  - failures are silent; the badge simply keeps its last known value
 */
interface NotificationCountContextProps {
  unreadCount: number;
  /** Schedule a low-priority background refresh of the unread count. */
  refresh: () => void;
}

const NotificationCountContext = createContext<NotificationCountContextProps | undefined>(undefined);

/** Extra idle delay before hitting the network (ms). */
const REFRESH_DELAY_MS = 2000;

const countCachedUnread = (list: unknown): number =>
  Array.isArray(list) ? list.filter((n: any) => n && !n.read).length : 0;

export const NotificationCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;
    // Debounce: collapse bursts of triggers into a single request.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void InteractionManager.runAfterInteractions(async () => {
        try {
          const unread = await getNotifications(token, true);
          setUnreadCount(Array.isArray(unread) ? unread.length : 0);
        } catch {
          // Silent: keep showing the last known value.
        }
      });
    }, REFRESH_DELAY_MS);
  }, [token]);

  // Seed instantly from the cached notifications list, then schedule the
  // first (low-priority) background refresh.
  useEffect(() => {
    let cancelled = false;
    setUnreadCount(0);
    (async () => {
      if (!user?.id) return;
      try {
        const cached = await readOfflineCache<any[]>(offlineCacheKey('notifications', user.id));
        if (!cancelled && cached) setUnreadCount(countCachedUnread(cached));
      } catch {
        // Ignore cache failures.
      }
      if (!cancelled) refresh();
    })();
    return () => { cancelled = true; };
  }, [user?.id, token, refresh]);

  // Clear any pending scheduled refresh on unmount.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Refresh (deferred) whenever the app comes back to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return (
    <NotificationCountContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationCountContext.Provider>
  );
};

export const useNotificationCount = (): NotificationCountContextProps => {
  const ctx = useContext(NotificationCountContext);
  if (!ctx) throw new Error('useNotificationCount must be used within NotificationCountProvider');
  return ctx;
};