// @ts-ignore - types available after install
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import prisma from './prisma';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export function isValidExpoPushToken(token: string): boolean {
  try {
    return Expo.isExpoPushToken(token);
  } catch {
    return /^ExpoPushToken\[.+\]$/.test(token);
  }
}

export async function registerUserPushToken(opts: {
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string | null;
}) {
  const { userId, token, platform, deviceId } = opts;
  if (!isValidExpoPushToken(token)) return null;
  const pAny: any = prisma as any;
  const upserted = await pAny.pushToken.upsert({
    where: { token },
    update: { userId, platform: platform as any, deviceId: deviceId || undefined, isActive: true, lastUsedAt: new Date() },
    create: { userId, token, platform: platform as any, deviceId: deviceId || undefined, isActive: true },
  });
  return upserted;
}

export async function unregisterUserPushToken(token: string) {
  try {
    const pAny: any = prisma as any;
    return await pAny.pushToken.update({ where: { token }, data: { isActive: false } });
  } catch {
    return null;
  }
}

export async function sendExpoPushToUser(userId: string, title: string, body: string, data?: any) {
  const pAny: any = prisma as any;
  const tokens: any[] = await pAny.pushToken.findMany({ where: { userId, isActive: true } });
  if (!tokens.length) return { sent: 0 };

  const validTokens = tokens.filter((t) => isValidExpoPushToken(t.token));
  const messages: ExpoPushMessage[] = validTokens.map((t) => ({ to: t.token, sound: 'default', title, body, data, priority: 'high' }));

  if (!messages.length) return { sent: 0 };

  const chunks = expo.chunkPushNotifications(messages);
  let sentCount = 0;
  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
      // tickets align with chunk order
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i] as any;
        const msg = chunk[i];
        if (ticket.status === 'ok') {
          sentCount += 1;
        } else if (ticket.status === 'error') {
          const code = ticket.details?.error;
          if (code === 'DeviceNotRegistered' && typeof msg.to === 'string') {
            try {
              await pAny.pushToken.update({ where: { token: msg.to }, data: { isActive: false } });
            } catch {}
          } else {
            console.warn('Expo push error ticket:', ticket);
          }
        }
      }
    } catch (error) {
      console.error('Expo push send error:', error);
    }
  }

  return { sent: sentCount };
}
