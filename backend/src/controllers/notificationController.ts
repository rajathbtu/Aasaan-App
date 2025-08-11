import { Request, Response } from 'express';
import prisma from '../utils/prisma';

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
    res.status(500).json({ message: 'Failed to fetch notifications' });
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
    res.status(500).json({ message: 'Failed to mark notifications read' });
  }
}