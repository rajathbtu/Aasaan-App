import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { registerPushToken as apiRegisterPushToken, unregisterPushToken as apiUnregisterPushToken } from '../api';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[NOTIFICATION HANDLER] Received notification:', notification);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

const SECURE_KEY = 'expo_push_token';

export async function registerForPushNotificationsAsync(token: string, deviceId?: string) {
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  let expoToken: string;
  try {
    // Use the real project ID from EAS
    const projectId = "30a58cf2-a668-45d2-81a8-130261a7a756";
    console.log('Getting Expo push token with projectId:', projectId);

    // Try to get the push token with real project ID
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    expoToken = tokenResponse.data;
    console.log('Expo Push Token obtained successfully:', expoToken);
  } catch (error: any) {
    console.log('Failed to get Expo push token:', error?.message || error);
    console.log('Error details:', JSON.stringify(error, null, 2));

    // For development, create a test token
    if (__DEV__) {
      console.log('Using development test token');
      expoToken = `ExponentPushToken[dev-${Date.now()}]`;
    } else {
      return null;
    }
  }

  if (Platform.OS === 'android') {
    // Create default notification channel with maximum importance
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableLights: true,
      enableVibrate: true,
      sound: 'default',
    });
    
    // Create a high-priority channel for work requests
    await Notifications.setNotificationChannelAsync('work_requests', {
      name: 'Work Requests',
      description: 'Notifications about new work opportunities',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FF0000',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableLights: true,
      enableVibrate: true,
      sound: 'default',
    });
    
    // Create urgent channel for time-sensitive notifications (Android 12 compatible)
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Urgent Notifications',
      description: 'Time-sensitive notifications that require immediate attention',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 500, 1000],
      lightColor: '#FF0000',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableLights: true,
      enableVibrate: true,
      sound: 'default',
    });
    
    console.log('Android notification channels configured');
  }

  // Only attempt backend registration if token string looks like an Expo push token
  const looksLikeExpoToken = /^(Expo|Exponent)PushToken\[[A-Za-z0-9._-]+\]$/.test(expoToken);
  if (!looksLikeExpoToken) {
    console.log('Skipping backend registration due to invalid-looking push token:', expoToken);
  } else {
    try {
      await apiRegisterPushToken(token, expoToken, Platform.OS as 'ios' | 'android', deviceId);
      console.log('Push token registered successfully');
    } catch (apiError) {
      console.log('Failed to register push token with backend:', apiError);
    }
  }

  await SecureStore.setItemAsync(SECURE_KEY, expoToken);
  return expoToken;
}

export async function getStoredExpoPushToken() {
  return SecureStore.getItemAsync(SECURE_KEY);
}

export async function unregisterPushToken(token: string, expoPushToken?: string | null) {
  try {
    const t = expoPushToken || await SecureStore.getItemAsync(SECURE_KEY);
    if (t) {
      await apiUnregisterPushToken(token, t);
    }
  } catch (e) {
    console.warn('Failed to unregister push token', e);
  } finally {
    await SecureStore.deleteItemAsync(SECURE_KEY);
  }
}

export function addForegroundListener(cb: (n: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(cb);
}
