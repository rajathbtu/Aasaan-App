import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getReqLang, t } from '../utils/i18n';
import { sendExpoPushToUser } from '../utils/expoPush';

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

// Simple test endpoint to send a push with sample data
export async function sendTest(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    console.log(`[TEST NOTIFICATION] Sending test notification to user ${user.id}`);
    const result = await sendExpoPushToUser(user.id, 'Test Notification', 'Hello from Aasaan! This is a test notification.', { test: true });
    console.log(`[TEST NOTIFICATION] Result:`, result);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('send test push error', e);
    res.status(500).json({ ok: false });
  }
}