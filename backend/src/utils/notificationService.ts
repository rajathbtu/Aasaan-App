import { getFirebaseAdmin } from './firebaseAdmin';
import { messaging } from 'firebase-admin';
import prisma from './prisma';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  token: string,
  notification: NotificationPayload
): Promise<string> {
  try {
    const admin = getFirebaseAdmin();
    
    const message: messaging.Message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'work_requests',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw new Error('Failed to send push notification');
  }
}

/**
 * Send push notifications to multiple devices
 */
export async function sendBulkPushNotifications(
  tokens: string[],
  notification: NotificationPayload
): Promise<messaging.BatchResponse> {
  try {
    const admin = getFirebaseAdmin();
    
    const message: messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'work_requests',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications`);
    if (response.failureCount > 0) {
      console.log(`Failed to send ${response.failureCount} notifications`);
    }
    return response;
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    throw new Error('Failed to send bulk push notifications');
  }
}

/**
 * Validate FCM token
 */
export async function validateFCMToken(token: string): Promise<boolean> {
  try {
    const admin = getFirebaseAdmin();
    
    const message: messaging.Message = {
      token,
      notification: {
        title: 'Test',
        body: 'Test',
      },
    };

    await admin.messaging().send(message, true); // dry-run = true
    return true;
  } catch (error) {
    console.error('Invalid FCM token:', error);
    return false;
  }
}

/**
 * Get FCM tokens for a user from their registered devices
 */
export async function getUserFCMTokens(userId: string): Promise<string[]> {
  try {
    const devices = await (prisma as any).device.findMany({
      where: {
        userId,
        provider: 'fcm',
        enabled: true,
      },
    });
    
    return devices.map((device: any) => device.token).filter(Boolean);
  } catch (error) {
    console.error('Error fetching user FCM tokens:', error);
    return [];
  }
}

/**
 * Send notification to a specific user (all their devices)
 */
export async function sendNotificationToUser(
  userId: string,
  notification: NotificationPayload
): Promise<messaging.BatchResponse | null> {
  const tokens = await getUserFCMTokens(userId);
  
  if (tokens.length === 0) {
    console.log(`No FCM tokens found for user ${userId}`);
    return null;
  }
  
  return sendBulkPushNotifications(tokens, notification);
}

/**
 * Send notification about new work request to nearby service providers
 */
export async function notifyNearbyProviders(
  providerTokens: string[],
  workRequest: {
    id: string;
    title: string;
    description: string;
    location: string;
    urgency?: string;
  }
): Promise<messaging.BatchResponse> {
  const urgencyText = workRequest.urgency === 'URGENT' ? '🔥 URGENT: ' : '';
  
  return sendBulkPushNotifications(providerTokens, {
    title: `${urgencyText}New Work Request`,
    body: `${workRequest.title} in ${workRequest.location}`,
    data: {
      type: 'work_request',
      workRequestId: workRequest.id,
      action: 'view_details',
    },
  });
}

export default {
  sendPushNotification,
  sendBulkPushNotifications,
  validateFCMToken,
  getUserFCMTokens,
  sendNotificationToUser,
  notifyNearbyProviders,
};
