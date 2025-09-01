import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { token, platform, provider = 'fcm' } = req.body;
    const userId = (req as any).user.id;

    // Type assertion for device model until Prisma client issue is resolved
    const db = prisma as any;
    await db.device.upsert({
      where: { token },
      update: { enabled: true, lastActive: new Date(), platform },
      create: { userId, token, platform, provider, enabled: true }
    });

    res.status(200).json({ message: 'Device registered successfully' });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ message: 'Failed to register device' });
  }
};

export const unregisterDevice = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    // Type assertion for device model until Prisma client issue is resolved
    const db = prisma as any;
    await db.device.update({ where: { token }, data: { enabled: false } });

    res.status(200).json({ message: 'Device unregistered successfully' });
  } catch (error) {
    console.error('Error unregistering device:', error);
    res.status(500).json({ message: 'Failed to unregister device' });
  }
};
