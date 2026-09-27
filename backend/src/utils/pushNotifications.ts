import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import prisma from './prisma';

const expo = new Expo();

export async function sendPushToUser(
  userId: string,
  notification: Pick<ExpoPushMessage, 'title' | 'body' | 'data'>,
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
    const token = user?.pushToken;
    if (!token) {
      console.warn(`Push notification skipped for user ${userId}: no push token`);
      return false;
    }
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`Push notification skipped for user ${userId}: invalid Expo push token`);
      return false;
    }
    const isNewRequest = notification.data?.type === 'newRequest';
    const tickets = await expo.sendPushNotificationsAsync([{
      to: token,
      sound: isNewRequest ? 'new_request.wav' : 'default',
      channelId: isNewRequest ? 'new-work-requests' : 'work-requests',
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }]);
    const failedTickets = tickets.filter((ticket) => ticket.status === 'error');
    if (failedTickets.length) {
      console.error(`Expo rejected push notification for user ${userId}:`, failedTickets);
    }
    if (failedTickets.some((ticket) => ticket.details?.error === 'DeviceNotRegistered')) {
      await prisma.user.updateMany({
        where: { id: userId, pushToken: token },
        data: { pushToken: null, pushTokenPlatform: null, pushTokenUpdatedAt: null },
      });
    }
    return failedTickets.length === 0;
  } catch (error) {
    console.error('Expo push delivery failed:', error);
    return false;
  }
}