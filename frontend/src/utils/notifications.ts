import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api';
import * as SecureStore from 'expo-secure-store';

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
    return null;
  }

  const projectId = (Constants as any).expoConfig?.extra?.eas?.projectId || (Constants as any).easConfig?.projectId;
  const expoToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  await api.post('/push-tokens/register', {
    token: expoToken,
    platform: Platform.OS,
    deviceId,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });

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
      await api.post('/push-tokens/unregister', { token: t }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
