import { Request, Response } from 'express';
import { isValidName, isValidRadius } from '../utils/validation';
import prisma from '../utils/prisma';
import { Role } from '../models/User';
import { getReqLang, t } from '../utils/i18n';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const lang = getReqLang(req);
  try {
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) { res.status(404).json({ message: t(lang, 'user.notFound') }); return; }
    const sp = await prisma.serviceProviderInfo.findUnique({ where: { userId: user.id }, include: { location: true } }).catch(() => null);
    res.json({ ...user, role: user.role ?? null, serviceProviderInfo: sp || null });
  } catch {
    res.status(500).json({ message: t(lang, 'user.profileFetchFailed') });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const lang = getReqLang(req);
  const { name, language, role, services, location, radius, plan, avatarUrl } = req.body as {
    name?: string;
    language?: string;
    role?: Role;
    services?: string[];
    location?: { name: string; lat: number; lng: number } | null;
    radius?: number;
    plan?: 'free' | 'basic' | 'pro';
    avatarUrl?: string | null;
  };

  const data: any = {};
  if (name !== undefined) {
    if (!isValidName(name)) { res.status(400).json({ message: t(lang, 'auth.invalidName') }); return; }
    data.name = name.trim();
  }
  if (language !== undefined) data.language = language;
  if (plan !== undefined) data.plan = plan;
  if (role !== undefined) data.role = role;
  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== 'string') { res.status(400).json({ message: t(lang, 'user.invalidAvatarUrl') }); return; }
    data.avatarUrl = avatarUrl;
  }

  // Ensure services, radius, and location are properly validated and handled
  if (services !== undefined) {
    if (!Array.isArray(services) || services.some(s => typeof s !== 'string' || !s.trim())) {
      res.status(400).json({ message: t(lang, 'user.invalidServicesArray') });
      return;
    }
  }

  if (radius !== undefined) {
    if (typeof radius !== 'number' || !isValidRadius(radius)) { res.status(400).json({ message: t(lang, 'user.invalidRadius') }); return; }
  }

  if (location !== undefined) {
    if (location === null) {
      // Allow null to disconnect location
    } else if (
      typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number'
    ) {
      res.status(400).json({ message: t(lang, 'user.invalidLocation') });
      return;
    }
  }

  // Ensure services, location, and radius are handled in ServiceProviderInfo via spUpdate
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
          location:
            location === null
              ? { disconnect: true }
              : location
              ? {
                  upsert: {
                    create: { name: location.name, lat: location.lat, lng: location.lng },
                    update: { name: location.name, lat: location.lat, lng: location.lng }
                  }
                }
              : undefined,
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
    console.error('Error updating profile:', e);
    res.status(500).json({ message: t(lang, 'user.updateFailed') });
  }
}