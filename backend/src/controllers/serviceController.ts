import { Request, Response } from 'express';
import { getReqLang, t } from '../utils/i18n';
import { getServices } from '../utils/serviceCache';

export async function listServices(req: Request, res: Response) {
  try {
    const items = await getServices();
    res.json({ services: items, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'services.fetchFailed'), error: err.message });
  }
}
