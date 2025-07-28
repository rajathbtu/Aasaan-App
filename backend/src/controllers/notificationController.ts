import { Request, Response } from 'express';
import { notifications } from '../models/dataStore';

/**
 * Return all notifications for the authenticated user.  Clients may
 * optionally provide a query parameter `unread=true` to only return
 * unread notifications.  Notifications are returned newest first.
 */
export function list(req: Request, res: Response): void {
  const user = (req as any).user;
  const unreadOnly = req.query.unread === 'true';
  let list = notifications.filter(n => n.userId === user.id);
  if (unreadOnly) list = list.filter(n => !n.read);
  // Sort by newest first
  list = list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(list);
}

/**
 * Mark all notifications as read.  Returns the count of updated
 * notifications.
 */
export function markAllRead(req: Request, res: Response): void {
  const user = (req as any).user;
  let count = 0;
  notifications.forEach(n => {
    if (n.userId === user.id && !n.read) {
      n.read = true;
      count++;
    }
  });
  res.json({ count });
}