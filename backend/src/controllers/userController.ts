import { Request, Response } from 'express';
import { Expo } from 'expo-server-sdk';
import { isValidName, isValidRadius } from '../utils/validation';
import prisma from '../utils/prisma';
import { Role } from '../models/User';
import { getReqLang, t } from '../utils/i18n';
import { getVisibleProfilePhotoUrl } from '../utils/profilePhoto';
import { isModerator } from '../utils/moderator';

const providerGenders = new Set(['male', 'female']);
const minimumProfileYear = 1940;

function getRatingSummary(user: { ratingsScoreSum: number; ratingsCount: number }) {
  return {
    average: user.ratingsCount > 0 ? user.ratingsScoreSum / user.ratingsCount : null,
    count: user.ratingsCount,
  };
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const lang = getReqLang(req);
  try {
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) { res.status(404).json({ message: t(lang, 'user.notFound') }); return; }
    const sp = await prisma.serviceProviderInfo.findUnique({ where: { userId: user.id }, include: { location: true } }).catch(() => null);
    const userRating = getRatingSummary(user);
    res.json({
      ...user,
      picUrl: getVisibleProfilePhotoUrl(user.picModeration, user.picUrl),
      role: user.role ?? null,
      serviceProviderInfo: sp || null,
      userRating,
      isModerator: isModerator(user.id),
    });
  } catch {
    res.status(500).json({ message: t(lang, 'user.profileFetchFailed') });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const lang = getReqLang(req);
  const { name, language, role, services, location, radius, plan, workSinceYear, birthYear, gender, bio } = req.body as {
    name?: string;
    language?: string;
    role?: Role;
    services?: string[];
    location?: { name: string; lat: number; lng: number } | null;
    radius?: number;
    plan?: 'free' | 'basic' | 'pro';
    workSinceYear?: number | null;
    birthYear?: number | null;
    gender?: 'male' | 'female' | null;
    bio?: string | null;
  };

  if (Object.prototype.hasOwnProperty.call(req.body, 'picUrl')) {
    res.status(400).json({ message: 'Profile photos must be uploaded for moderation.' });
    return;
  }

  const data: any = {};
  if (name !== undefined) {
    if (!isValidName(name)) { res.status(400).json({ message: t(lang, 'auth.invalidName') }); return; }
    data.name = name.trim();
  }
  if (language !== undefined) data.language = language;
  if (plan !== undefined) data.plan = plan;
  if (role !== undefined) data.role = role;
  const currentYear = new Date().getFullYear();
  const isValidProfileYear = (value: number | null | undefined) => (
    value === undefined || value === null || (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= minimumProfileYear &&
      value <= currentYear
    )
  );
  if (!isValidProfileYear(workSinceYear) || !isValidProfileYear(birthYear)) {
    res.status(400).json({ message: t(lang, 'user.invalidProfileYear') });
    return;
  }
  if (workSinceYear !== null && birthYear !== null && workSinceYear !== undefined && birthYear !== undefined && birthYear > workSinceYear) {
    res.status(400).json({ message: t(lang, 'user.invalidProfileYearOrder') });
    return;
  }
  if (gender !== undefined && gender !== null && !providerGenders.has(gender)) {
    res.status(400).json({ message: t(lang, 'user.invalidGender') });
    return;
  }
  if (bio !== undefined && bio !== null && (
    typeof bio !== 'string' ||
    bio.length > 500 ||
    /[\u0000-\u001F\u007F]/.test(bio)
  )) {
    res.status(400).json({ message: t(lang, 'user.invalidBio') });
    return;
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
  if (role === 'serviceProvider' || services !== undefined || location !== undefined || radius !== undefined || workSinceYear !== undefined || birthYear !== undefined || gender !== undefined || bio !== undefined) {
    spUpdate = {
      upsert: {
        create: {
          services: services && services.length ? services : [],
          radius: radius ?? 20, //default radius if not provided
          workSinceYear: workSinceYear ?? null,
          birthYear: birthYear ?? null,
          gender: gender ?? null,
          bio: bio === undefined || bio === null ? null : bio.trim(),
          location: location ? { create: { name: location.name, lat: location.lat, lng: location.lng } } : undefined,
        },
        update: {
          services: services !== undefined ? services : undefined,
          radius: radius !== undefined ? radius : undefined,
          workSinceYear: workSinceYear !== undefined ? workSinceYear : undefined,
          birthYear: birthYear !== undefined ? birthYear : undefined,
          gender: gender !== undefined ? gender : undefined,
          bio: bio === undefined ? undefined : bio === null ? null : bio.trim(),
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
    const userRating = getRatingSummary(updated);
    res.json({
      ...updated,
      picUrl: getVisibleProfilePhotoUrl(updated.picModeration, updated.picUrl),
      serviceProviderInfo: sp || null,
      userRating,
      isModerator: isModerator(updated.id),
    });
  } catch (e) {
    console.error('Error updating profile:', e);
    res.status(500).json({ message: t(lang, 'user.updateFailed') });
  }
}

export async function registerPushToken(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const { token, platform } = req.body as { token?: string; platform?: string };
  if (!token || !Expo.isExpoPushToken(token)) {
    res.status(400).json({ message: 'Invalid Expo push token' });
    return;
  }
  if (platform !== 'android' && platform !== 'ios') {
    res.status(400).json({ message: 'Invalid push token platform' });
    return;
  }
  try {
    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: { pushToken: token, pushTokenPlatform: platform, pushTokenUpdatedAt: new Date() },
      select: { id: true, pushTokenUpdatedAt: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to register push token' });
  }
}

export async function removePushToken(req: Request, res: Response): Promise<void> {
  const authUser = (req as any).user as { id: string };
  const token = typeof req.body?.token === 'string' ? req.body.token : undefined;
  try {
    await prisma.user.updateMany({
      where: { id: authUser.id, ...(token ? { pushToken: token } : {}) },
      data: { pushToken: null, pushTokenPlatform: null, pushTokenUpdatedAt: null },
    });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to remove push token' });
  }
}