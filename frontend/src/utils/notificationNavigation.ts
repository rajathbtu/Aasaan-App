export type NotificationUserRole = 'endUser' | 'serviceProvider';

type NotificationNavigationParams = Record<string, string>;

export interface NotificationNavigationTarget {
  screen: 'SPAvailable' | 'WorkRequestDetails';
  params: NotificationNavigationParams;
}

/** Return the destination for a notification, or null when it has no action yet. */
export function getNotificationNavigationTarget(
  role: NotificationUserRole,
  type: string,
  requestId?: string,
): NotificationNavigationTarget | null {
  if (!requestId) return null;

  if (role === 'serviceProvider' && type === 'newRequest') {
    return {
      screen: 'SPAvailable',
      params: { highlightedRequestId: requestId },
    };
  }

  if (role === 'endUser' && type === 'requestAccepted') {
    return {
      screen: 'WorkRequestDetails',
      params: { id: requestId },
    };
  }

  return null;
}
