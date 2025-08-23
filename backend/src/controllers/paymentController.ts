import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { pushNotification } from '../models/dataStore';
import { getReqLang, t, notifyUser } from '../utils/i18n';

export async function boostWorkRequest(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'endUser') { res.status(403).json({ message: t(lang, 'payment.onlyEndUsers') }); return; }
  const { requestId, useCredits } = req.body as { requestId: string; useCredits?: boolean };
  try {
    const wr = await prisma.workRequest.findFirst({ where: { id: requestId, userId: user.id } });
    if (!wr) { res.status(404).json({ message: t(lang, 'request.notFound') }); return; }
    if (wr.boosted) { res.status(409).json({ message: t(lang, 'payment.alreadyBoosted') }); return; }
    const costPoints = 100;
    if (useCredits) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) { res.status(404).json({ message: t(lang, 'user.notFound') }); return; }
      if (dbUser.creditPoints < costPoints) { res.status(400).json({ message: t(lang, 'payment.insufficientCredits') }); return; }
      await prisma.user.update({ where: { id: user.id }, data: { creditPoints: { decrement: costPoints } } });
    }
    const updatedWr = await prisma.workRequest.update({ where: { id: wr.id }, data: { boosted: true } });
    await notifyUser({
      userId: user.id,
      type: 'boostPromotion',
      titleKey: 'notifications.boosted.title',
      messageKey: 'notifications.boosted.message',
      data: { requestId: wr.id },
    });
    res.json(updatedWr);
  } catch {
    res.status(500).json({ message: t(lang, 'payment.boostFailed') });
  }
}

export async function subscribePlan(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'serviceProvider') { res.status(403).json({ message: t(lang, 'subscription.onlyProviders') }); return; }
  const { plan, useCredits } = req.body as { plan: 'basic' | 'pro'; useCredits?: boolean };
  const cost = plan === 'basic' ? 100 : 200;
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) { res.status(404).json({ message: t(lang, 'user.notFound') }); return; }
    if (useCredits) {
      if (dbUser.creditPoints < cost) { res.status(400).json({ message: t(lang, 'payment.insufficientCredits') }); return; }
      await prisma.user.update({ where: { id: user.id }, data: { creditPoints: { decrement: cost }, plan } });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { plan } });
    }
    await notifyUser({
      userId: user.id,
      type: 'planPromotion',
      titleKey: 'notifications.subscriptionSuccess.title',
      messageKey: 'notifications.subscriptionSuccess.message',
      params: { plan },
      data: { plan }
    });
    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    res.json(refreshed);
  } catch {
    res.status(500).json({ message: t(lang, 'subscription.failed') });
  }
}