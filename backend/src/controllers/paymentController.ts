import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { pushNotification } from '../models/dataStore';

export async function boostWorkRequest(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (user.role !== 'endUser') { res.status(403).json({ message: 'Only end users can boost requests' }); return; }
  const { requestId, useCredits } = req.body as { requestId: string; useCredits?: boolean };
  try {
    const wr = await prisma.workRequest.findFirst({ where: { id: requestId, userId: user.id } });
    if (!wr) { res.status(404).json({ message: 'Work request not found' }); return; }
    if (wr.boosted) { res.status(409).json({ message: 'Work request is already boosted' }); return; }
    const costPoints = 100;
    if (useCredits) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) { res.status(404).json({ message: 'User not found' }); return; }
      if (dbUser.creditPoints < costPoints) { res.status(400).json({ message: 'Insufficient credit points' }); return; }
      await prisma.user.update({ where: { id: user.id }, data: { creditPoints: { decrement: costPoints } } });
    }
    const updatedWr = await prisma.workRequest.update({ where: { id: wr.id }, data: { boosted: true } });
    await pushNotification({
      userId: user.id,
      type: 'boostPromotion',
      title: 'Your request has been boosted',
      message: 'Your work request will now appear at the top of provider feeds.',
      data: { requestId: wr.id }
    });
    res.json(updatedWr);
  } catch {
    res.status(500).json({ message: 'Boost failed' });
  }
}

export async function subscribePlan(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (user.role !== 'serviceProvider') { res.status(403).json({ message: 'Only service providers can subscribe' }); return; }
  const { plan, useCredits } = req.body as { plan: 'basic' | 'pro'; useCredits?: boolean };
  const cost = plan === 'basic' ? 100 : 200;
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) { res.status(404).json({ message: 'User not found' }); return; }
    if (useCredits) {
      if (dbUser.creditPoints < cost) { res.status(400).json({ message: 'Insufficient credit points' }); return; }
      await prisma.user.update({ where: { id: user.id }, data: { creditPoints: { decrement: cost }, plan } });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { plan } });
    }
    await pushNotification({
      userId: user.id,
      type: 'planPromotion',
      title: 'Subscription Successful',
      message: `You have subscribed to the ${plan} plan. Enjoy your benefits!`,
      data: { plan }
    });
    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    res.json(refreshed);
  } catch {
    res.status(500).json({ message: 'Subscription failed' });
  }
}