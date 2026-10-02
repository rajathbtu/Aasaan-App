import { NextFunction, Request, Response } from 'express';
import { isModerator } from '../utils/moderator';

export function requireModerator(req: Request, res: Response, next: NextFunction): void {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || !isModerator(userId)) {
    res.status(403).json({ message: 'You are not authorized to moderate.' });
    return;
  }
  next();
}