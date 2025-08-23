import { Request, Response, NextFunction } from 'express';
import { findUserById } from '../models/dataStore';
import { getReqLang, t } from '../utils/i18n';

/**
 * Authentication middleware.  Expects an `Authorization` header with a
 * bearer token equal to the user ID.  Attaches the user to the request
 * object on success.  If the header is missing or invalid, returns 401.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const lang = getReqLang(req);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: t(lang, 'common.missingAuthHeader') });
    return;
  }
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const user = await findUserById(token);
    if (!user) {
      res.status(401).json({ message: t(lang, 'common.invalidToken') });
      return;
    }
    (req as any).user = user;
    next();
  } catch (e) {
    res.status(500).json({ message: t(lang, 'common.authLookupFailed') });
  }
}