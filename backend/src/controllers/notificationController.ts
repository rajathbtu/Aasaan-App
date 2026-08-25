import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getReqLang, t } from '../utils/i18n';

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
 * Mark a single notification as read.  Scoped to the authenticated user
 * so a caller can never touch another user's notifications.  Idempotent:
 * marking an already-read (or missing) notification simply reports a
 * count of 0 instead of failing.
 */
export async function markRead(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { id } = req.params;
  try {
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true }
    });
    res.json({ count: result.count });
  } catch {
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}