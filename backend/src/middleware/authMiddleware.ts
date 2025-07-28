import { Request, Response, NextFunction } from 'express';
import { findUserById } from '../models/dataStore';

/**
 * Authentication middleware.  Expects an `Authorization` header with a
 * bearer token equal to the user ID.  Attaches the user to the request
 * object on success.  If the header is missing or invalid, returns 401.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const user = findUserById(token);
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  // Attach the user to the request object
  (req as any).user = user;
  next();
}