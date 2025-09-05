import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { registerPushToken as apiRegisterPushToken, unregisterPushToken as apiUnregisterPushToken } from '../api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
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
    const projectId = (Constants as any).expoConfig?.extra?.eas?.projectId || (Constants as any).easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    expoToken = tokenResponse.data;
    console.log('Expo Push Token:', expoToken);
  } catch (error) {
    console.log('Failed to get Expo push token:', error);
    return null; // Don't fabricate tokens; cannot receive pushes without a real token
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
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
