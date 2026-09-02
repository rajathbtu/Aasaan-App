import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getReqLang, t } from '../utils/i18n';
import { getCachedServices, CachedService } from '../utils/serviceCache';
import { syncServices } from '../utils/serviceSeeder';

export async function listServices(req: Request, res: Response) {
  try {
    const pAny = prisma as any;
    const items = await getCachedServices(async () => {
      await syncServices();
      return pAny.service.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }) as Promise<CachedService[]>;
    });
    res.json({ services: items, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'services.fetchFailed'), error: err.message });
  }
}
