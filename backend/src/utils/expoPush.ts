// @ts-ignore - types available after install
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import prisma from './prisma';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export function isValidExpoPushToken(token: string): boolean {
  try {
    if (Expo.isExpoPushToken(token)) return true;
  } catch {
    // ignore
  }
  // Accept both ExpoPushToken[...] and ExponentPushToken[...] formats
  return /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token);
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
  console.log(`[EXPO PUSH] Sending to user: ${userId}`);
  const pAny: any = prisma as any;
  const tokens: any[] = await pAny.pushToken.findMany({ where: { userId, isActive: true } });
  
  if (!tokens.length) return { sent: 0 };

  const validTokens = tokens.filter((t) => isValidExpoPushToken(t.token));
  console.log(`[EXPO PUSH] Found ${validTokens.length} valid tokens`);
  
  const messages: ExpoPushMessage[] = validTokens.map((t) => ({
    to: t.token,
    sound: 'default' as const,
    title: title || 'New Work Request',
    body: body || 'A new work request has been posted in your area.',
    data: data || {},
    priority: 'high' as const,
    channelId: 'urgent',
    badge: 1,
    // Android-specific configuration for better delivery
    ...(t.platform === 'android' && {
      android: {
        channelId: 'urgent',
        priority: 'high',
        sound: 'default',
        vibrate: true,
        lights: true,
        color: '#FF0000',
      }
    }),
    // iOS-specific configuration
    ...(t.platform === 'ios' && {
      ios: {
        sound: 'default',
        badge: 1,
      }
    })
  }));

  if (!messages.length) return { sent: 0 };

  const chunks = expo.chunkPushNotifications(messages);
  let sentCount = 0;
  
  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
      
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i] as any;
        const msg = chunk[i];
        if (ticket.status === 'ok') {
          sentCount += 1;
          console.log(`[EXPO PUSH] ✅ Sent successfully to ${validTokens.find(t => t.token === msg.to)?.platform}`);
        } else if (ticket.status === 'error') {
          const code = ticket.details?.error;
          console.log(`[EXPO PUSH] ❌ Error: ${code}`);
          
          if (code === 'DeviceNotRegistered' && typeof msg.to === 'string') {
            try {
              await pAny.pushToken.update({ where: { token: msg.to }, data: { isActive: false } });
              console.log(`[EXPO PUSH] Deactivated invalid token`);
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('[EXPO PUSH] Send error:', error);
    }
  }

  console.log(`[EXPO PUSH] Final result: sent ${sentCount}/${messages.length} notifications`);
  return { sent: sentCount };
}
