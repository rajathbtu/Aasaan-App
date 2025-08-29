import prisma from './prisma';
import firebaseAdmin from './firebaseAdmin';

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
  try {
    // Type assertion for device model until Prisma client issue is resolved
    const db = prisma as any;
    const devices = await db.device.findMany({ where: { userId, enabled: true, provider: 'fcm' } });
    if (!devices?.length) return;
    
    const tokens: string[] = devices.map((d: any) => d.token);

    const messaging = firebaseAdmin.messaging();
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
      android: { priority: 'high', ttl: 3600 * 1000 },
      apns: { headers: { 'apns-priority': '10' } },
    });

    // disable invalid tokens
    const invalid: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success && r.error) {
        const errorCode = r.error.code || '';
        if (errorCode.includes('registration-token-not-registered') || 
            errorCode.includes('invalid-argument') || 
            errorCode.includes('invalid-registration-token')) {
          invalid.push(tokens[i]);
        }
      }
    });
    
    if (invalid.length) {
      await db.device.updateMany({ where: { token: { in: invalid } }, data: { enabled: false } });
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
