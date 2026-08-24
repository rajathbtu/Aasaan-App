import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function getPushToken(): Promise<{ token: string; platform: 'android' | 'ios' } | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('work-requests', {
      name: 'Work requests',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Missing Expo EAS projectId');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return { token, platform: Platform.OS };
}