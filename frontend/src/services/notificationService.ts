import { Platform } from 'react-native';
import { sendTestNotification } from '../api';

// Firebase messaging (only for native platforms)
let messaging: any = null;
try {
  if (Platform.OS !== 'web') {
    messaging = require('@react-native-firebase/messaging').default;
  }
} catch (error) {
  console.warn('Firebase messaging not available:', error);
}

// Ensure device is registered for remote messages (required on iOS before getToken)
async function ensureRegisteredForRemoteMessages(): Promise<boolean> {
  if (!messaging || Platform.OS === 'web') return false;
  try {
    // Enable auto init so FCM starts as soon as possible
    await messaging().setAutoInitEnabled?.(true);

    const isRegistered: boolean = !!messaging().isDeviceRegisteredForRemoteMessages;
    if (!isRegistered) {
      await messaging().registerDeviceForRemoteMessages();
    }

    // On iOS, make sure APNs token is available before requesting FCM token
    if (Platform.OS === 'ios') {
      const timeoutMs = 10000; // 10s max wait
      const start = Date.now();
      let apnsToken = await messaging().getAPNSToken();
      while (!apnsToken && Date.now() - start < timeoutMs) {
        await new Promise(res => setTimeout(res, 300));
        apnsToken = await messaging().getAPNSToken();
      }
      if (!apnsToken) {
        console.warn('APNs token not available yet; FCM token may fail.');
      }
    }

    return true;
  } catch (e) {
    console.error('Error registering device for remote messages:', e);
    return false;
  }
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!messaging || Platform.OS === 'web') {
    console.log('Push notifications not supported on this platform');
    return false;
  }

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Notification permission denied');
      return false;
    }

    // Important for iOS: must register for remote messages
    await ensureRegisteredForRemoteMessages();

    console.log('Notification permission granted');
    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get FCM token
 */
export async function getFCMToken(): Promise<string | null> {
  if (!messaging || Platform.OS === 'web') {
    return null;
  }

  try {
    // Ensure device is registered before fetching token
    await ensureRegisteredForRemoteMessages();
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for token refresh
 */
export function onTokenRefresh(handler: (token: string) => void): (() => void) | null {
  if (!messaging || Platform.OS === 'web') return null;
  try {
    return messaging().onTokenRefresh(handler);
  } catch (e) {
    console.error('Error subscribing to token refresh:', e);
    return null;
  }
}

/**
 * Set up foreground message handler
 */
export function setupForegroundMessageHandler(
  onMessage: (message: any) => void
): (() => void) | null {
  if (!messaging || Platform.OS === 'web') {
    return null;
  }

  try {
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      console.log('Received foreground message:', remoteMessage);
      onMessage(remoteMessage);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up foreground message handler:', error);
    return null;
  }
}

/**
 * Handle notification opened app scenarios
 */
export function setupNotificationOpenedHandler(
  onNotificationOpened: (notification: any) => void
): (() => void) | null {
  if (!messaging || Platform.OS === 'web') {
    return null;
  }

  try {
    // Handle notification opened app from background state
    const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      onNotificationOpened(remoteMessage);
    });

    // Check whether an initial notification is available
    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          onNotificationOpened(remoteMessage);
        }
      });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up notification opened handler:', error);
    return null;
  }
}

/**
 * Send test notification (for debugging)
 */
export async function testPushNotification(token: string): Promise<boolean> {
  try {
    await sendTestNotification(token);
    console.log('Test notification sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
}

export default {
  requestNotificationPermission,
  getFCMToken,
  onTokenRefresh,
  setupForegroundMessageHandler,
  setupNotificationOpenedHandler,
  testPushNotification,
};
