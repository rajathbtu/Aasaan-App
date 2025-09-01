import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getReqLang, t } from '../utils/i18n';
import { sendPushNotification, validateFCMToken } from '../utils/notificationService';

/**
 * Return all notifications for the authenticated user.  Clients may
 * optionally provide a query parameter `unread=true` to only return
 * unread notifications.  Notifications are returned newest first.
 */
export async function list(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const unreadOnly = req.query.unread === 'true';
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch {
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'services.fetchFailed') });
  }
}

/**
 * Mark all notifications as read.  Returns the count of updated
 * notifications.
 */
export async function markAllRead(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    const result = await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    res.json({ count: result.count });
  } catch {
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}

/**
 * Register FCM token for push notifications
 */
export async function registerFCMToken(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { token, platform } = req.body;
  const lang = getReqLang(req);

  if (!token) {
    res.status(400).json({ message: t(lang, 'common.missingRequiredFields') });
    return;
  }

  try {
    // Validate the FCM token
    const isValid = await validateFCMToken(token);
    if (!isValid) {
      res.status(400).json({ message: 'Invalid FCM token' });
      return;
    }

    // Check if this device is already registered
    const existingDevice = await (prisma as any).device.findFirst({
      where: {
        token,
        userId: user.id,
      },
    });

    if (existingDevice) {
      // Update existing device
      await (prisma as any).device.update({
        where: { id: existingDevice.id },
        data: {
          enabled: true,
          lastActive: new Date(),
          platform: platform || existingDevice.platform,
        },
      });
    } else {
      // Create new device registration
      await (prisma as any).device.create({
        data: {
          userId: user.id,
          provider: 'fcm',
          token,
          platform: platform || 'unknown',
          enabled: true,
        },
      });
    }

    res.json({ message: 'FCM token registered successfully' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}

/**
 * Remove FCM token (on logout)
 */
export async function unregisterFCMToken(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { token } = req.body;
  const lang = getReqLang(req);

  try {
    if (token) {
      // Remove specific token
      await (prisma as any).device.deleteMany({
        where: {
          userId: user.id,
          token,
          provider: 'fcm',
        },
      });
    } else {
      // Remove all FCM devices for user
      await (prisma as any).device.deleteMany({
        where: {
          userId: user.id,
          provider: 'fcm',
        },
      });
    }

    res.json({ message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}

/**
 * Send a test push notification
 */
export async function sendTestNotification(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);

  try {
    const devices = await (prisma as any).device.findMany({
      where: {
        userId: user.id,
        provider: 'fcm',
        enabled: true,
      },
    });

    if (devices.length === 0) {
      res.status(400).json({ message: 'No FCM tokens registered for this user' });
      return;
    }

    const tokens = devices.map((device: any) => device.token);

    for (const token of tokens) {
      await sendPushNotification(token, {
        title: '🎉 Test Notification',
        body: 'Your push notifications are working correctly!',
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({ 
      message: 'Test notification sent successfully',
      deviceCount: devices.length 
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}