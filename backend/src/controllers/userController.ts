import { Request, Response } from 'express';
import { isValidName, isValidRadius } from '../utils/validation';
import prisma from '../utils/prisma';
import { Role } from '../models/User';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  try {
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) { res.status(404).json({ message: 'Not found' }); return; }
    const sp = await prisma.serviceProviderInfo.findUnique({ where: { userId: user.id }, include: { location: true } }).catch(() => null);
    res.json({ ...user, serviceProviderInfo: sp || null });
  } catch {
    res.status(500).json({ message: 'Profile fetch failed' });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const { name, language, role, services, location, radius, plan } = req.body as {
    name?: string;
    language?: string;
    role?: Role;
    services?: string[];
    location?: { name: string; lat: number; lng: number } | null;
    radius?: number;
    plan?: 'free' | 'basic' | 'pro';
  };

  const data: any = {};
  if (name !== undefined) {
    if (!isValidName(name)) { res.status(400).json({ message: 'Invalid name' }); return; }
    data.name = name.trim();
  }
  if (language !== undefined) data.language = language;
  if (plan !== undefined) data.plan = plan;
  if (role !== undefined) data.role = role;

  // Validate services if provided
  if (services !== undefined) {
    if (!Array.isArray(services) || services.length === 0 || services.some(s => typeof s !== 'string' || !s.trim())) {
      res.status(400).json({ message: 'Services must be a non-empty string array' }); return; }
  }
  // Validate radius if provided
  if (radius !== undefined) {
    if (typeof radius !== 'number' || !isValidRadius(radius)) { res.status(400).json({ message: 'Invalid radius value' }); return; }
  }
  // Validate location shape if provided and not null
  if (location !== undefined && location !== null) {
    if (typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      res.status(400).json({ message: 'Invalid location' }); return; }
  }

  let spUpdate: any | undefined;
  if (role === 'serviceProvider' || services !== undefined || location !== undefined || radius !== undefined) {
    spUpdate = {
      upsert: {
        create: {
          services: services && services.length ? services : [],
          radius: radius ?? 5,
          location: location ? { create: { name: location.name, lat: location.lat, lng: location.lng } } : undefined,
        },
        update: {
          services: services !== undefined ? services : undefined,
          radius: radius !== undefined ? radius : undefined,
          ...(location !== undefined
            ? location === null
              ? { location: { disconnect: true } }
              : { location: {
                    upsert: {
                      create: { name: location.name, lat: location.lat, lng: location.lng },
                      update: { name: location.name, lat: location.lat, lng: location.lng }
                    }
                  } }
            : {}),
        },
      },
    };
  }

  try {
    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: { ...data, ...(spUpdate ? { serviceProviderInfo: spUpdate } : {}) },
    });
    const sp = await (prisma as any).serviceProviderInfo.findUnique({ where: { userId: updated.id }, include: { location: true } }).catch(() => null);
    res.json({ ...updated, serviceProviderInfo: sp || null });
  } catch (e) {
    res.status(500).json({ message: 'Update failed' });
  }
}