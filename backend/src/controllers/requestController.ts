import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { areValidTags } from '../utils/validation';
import { pushNotification } from '../models/dataStore';
import { getReqLang, t, notifyUser } from '../utils/i18n';
import { notifyNearbyProviders, sendNotificationToUser } from '../utils/notificationService';

const pAny: any = prisma;

// Helper to compute distance (in km) between two geo points using Haversine formula
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371; // km
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Response DTO (best‑effort typing while schema/types are realigned)
export interface FullWorkRequest {
  id: string;
  userId: string;
  service: string;
  // flattened fields may exist depending on current schema
  locationId?: string;
  location?: any;
  tags?: string[];
  createdAt?: Date;
  status?: string;
  boosted?: boolean;
  acceptedProviders?: any[];
  rating?: any | null;
  closedAt?: Date | null;
  [key: string]: any; // allow forward compatibility
}

// Build a full work request object with related entities via separate queries (avoids problematic includes)
async function buildFullWorkRequest(id: string): Promise<FullWorkRequest | null> {
  const wr = await pAny.workRequest.findUnique({ where: { id } });
  if (!wr) return null;
  const locationId = (wr as any).locationId as string | undefined;
  const [location, acceptedProviders, rating] = await Promise.all([
    locationId && pAny.location?.findUnique ? pAny.location.findUnique({ where: { id: locationId } }).catch(() => null) : null,
    pAny.acceptedProvider?.findMany ? pAny.acceptedProvider.findMany({ where: { workRequestId: id } }) : [],
    pAny.rating?.findFirst ? pAny.rating.findFirst({ where: { workRequestId: id } }) : null
  ]);

  // Enrich accepted providers with user profile (name, phone, avatarUrl)
  let acceptedWithDetails: any[] = acceptedProviders || [];
  try {
    const ids = Array.from(new Set((acceptedProviders || []).map((p: any) => p.providerId)));
    if (ids.length && pAny.user?.findMany) {
      const users = await pAny.user.findMany({ where: { id: { in: ids } } });
      const uMap = new Map(users.map((u: any) => [u.id, u]));
      acceptedWithDetails = (acceptedProviders || []).map((p: any) => ({
        ...p,
        provider: uMap.get(p.providerId) || null,
      }));
    }
  } catch {}

  return { ...(wr as any), location, acceptedProviders: acceptedWithDetails, rating } as FullWorkRequest;
}

/**
 * Create a new work request on behalf of an end user.  Validates the input
 * and enforces a simple quota of 3 requests per 24 hours.  If the quota is
 * exceeded the client is expected to handle payment before creating
 * additional requests.  After creation the request is broadcast to
 * eligible service providers via a notification (simplified).
 */
export async function create(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'endUser') { res.status(403).json({ message: t(lang, 'request.onlyEndUsersCreate') }); return; }
  const { service, location, tags } = req.body as any;
  if (!service || typeof service !== 'string') { res.status(400).json({ message: t(lang, 'request.serviceRequired') }); return; }
  if (!location || typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number') { res.status(400).json({ message: t(lang, 'user.invalidLocation') }); return; }
  if (tags && !areValidTags(tags)) { res.status(400).json({ message: t(lang, 'request.invalidTags') }); return; }
  try {
    const since = new Date(Date.now() - 24*60*60*1000);
    const recent = await prisma.workRequest.count({ where: { userId: user.id, createdAt: { gt: since } } });
    if (recent >= 3 && !req.body.force) { res.status(429).json({ message: t(lang, 'request.limitReached'), code: 'LIMIT_EXCEEDED' }); return; }
    const loc = await pAny.location.create?.({ data: { name: location.name, lat: location.lat, lng: location.lng } });
    const wr = await pAny.workRequest.create({ data: { userId: user.id, service, locationId: loc?.id, tags: tags || [] } });

    // Scalable: compute eligible providers in SQL using distance in meters and get their FCM tokens
    const radiusMeters = prisma.$queryRaw`SELECT 1`; // placeholder to force tagged template type
    const eligible = (await prisma.$queryRaw<any[]>`
      SELECT DISTINCT spi."userId", u."name"
      FROM "ServiceProviderInfo" spi
      JOIN "Location" ploc ON ploc."id" = spi."locationId"
      JOIN "User" u ON u."id" = spi."userId"
      WHERE ${service} = ANY(spi."services")
        AND spi."radius" > 0
        AND ST_DistanceSphere(
          ST_MakePoint(ploc."lng", ploc."lat"),
          ST_MakePoint(${location.lng}, ${location.lat})
        ) <= (spi."radius" * 1000)
    `) as any[];

    // Get FCM tokens for eligible providers
    const providerIds = eligible.map(row => row.userId);
    const devices = await (prisma as any).device.findMany({
      where: {
        userId: { in: providerIds },
        provider: 'fcm',
        enabled: true,
      },
    });
    
    const fcmTokens = devices.map((device: any) => device.token).filter(Boolean);

    // Send push notifications to nearby providers
    if (fcmTokens.length > 0) {
      try {
        await notifyNearbyProviders(fcmTokens, {
          id: wr.id,
          title: service,
          description: `New work request in ${location.name}`,
          location: location.name,
          urgency: req.body.urgency || 'NORMAL',
        });
        console.log(`Sent push notifications to ${fcmTokens.length} nearby providers`);
      } catch (error) {
        console.error('Error sending push notifications:', error);
        // Don't fail the request creation if notifications fail
      }
    }

    // Also send in-app notifications (existing functionality)
    for (const row of eligible) {
      notifyUser({
        userId: row.userId,
        type: 'newRequest',
        titleKey: 'notifications.newRequest.title',
        messageKey: 'notifications.newRequest.message',
        params: { name: user.name, service },
        data: { requestId: wr.id }
      }).catch(() => {});
    }

    res.status(201).json(wr);
  } catch { res.status(500).json({ message: t(lang, 'request.createFailed') }); }
}

/**
 * List work requests relevant to the authenticated user.  End users see
 * their own requests.  Service providers see active requests for which
 * they are eligible (matching service and within radius).
 */
export async function list(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (user.role === 'endUser') {
    const my = await pAny.workRequest.findMany({ where: { userId: user.id } });
    // Enrich with location objects so clients can display location.name
    try {
      const locationIds = Array.from(new Set((my as any[]).map((r: any) => r.locationId).filter(Boolean)));
      if (locationIds.length && pAny.location?.findMany) {
        const locations = await pAny.location.findMany({ where: { id: { in: locationIds } } });
        const locMap = new Map(locations.map((l: any) => [l.id, l]));
        const enriched = (my as any[]).map((r: any) => ({ ...r, location: locMap.get(r.locationId) || null }));
        res.json(enriched);
        return;
      }
    } catch {}
    res.json(my);
    return;
  }

  const providerInfo = await pAny.serviceProviderInfo?.findUnique?.({ where: { userId: user.id } });
  if (!providerInfo) {
    res.status(400).json({ message: 'Provider profile not found.' });
    return;
  }

  const services: string[] = providerInfo.services || [];

  if (providerInfo.locationId && providerInfo.radius > 0) {
    const providerLoc = await pAny.location?.findUnique?.({ where: { id: providerInfo.locationId } });
    if (providerLoc) {
      const radiusInMeters = providerInfo.radius * 1000; // Convert km to meters
      const relevantRequests = (await prisma.$queryRaw`
        SELECT wr.*
        FROM "WorkRequest" wr
        JOIN "Location" loc ON wr."locationId" = loc."id"
        WHERE wr."status" = 'active'
          AND wr."service" = ANY(${services})
          AND ST_DistanceSphere(
            ST_MakePoint(${providerLoc.lng}, ${providerLoc.lat}),
            ST_MakePoint(loc."lng", loc."lat")
          ) <= ${radiusInMeters};
      `) as any[];

      // Fetch additional details for each request
      const enrichedRequests = await Promise.all(
        relevantRequests.map(async (request: any) => {
          const [accepted, service, location, requestUser] = await Promise.all([
            pAny.acceptedProvider?.findFirst({
              where: { workRequestId: request.id, providerId: user.id },
            }),
            pAny.service?.findUnique({ where: { id: request.service } }),
            pAny.location?.findUnique({ where: { id: request.locationId } }),
            pAny.user?.findUnique({ where: { id: request.userId } }),
          ]);

          return {
            ...request,
            acceptedByProvider: !!accepted,
            serviceName: service?.name || null,
            serviceIcon: service?.icon || null,
            locationName: location?.name || null,
            locationLat: location?.lat || null,
            locationLng: location?.lng || null,
            requesterName: requestUser?.name || null,
            requesterPhone: requestUser?.phoneNumber || null,
          };
        })
      );

      console.log('enrichedRequests', enrichedRequests);
      res.json(enrichedRequests);
      return;
    }
  }

  res.status(400).json({ message: 'Location or radius not defined for the provider.' });
}

/**
 * Get details of a specific work request.  The request is visible to its
 * owner and to providers who have accepted it.  Other users receive a
 * 403.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const lang = getReqLang(req);
    const { id } = req.params;
    const wr = await pAny.workRequest.findUnique({ where: { id } });
    if (!wr) { res.status(404).json({ message: t(lang, 'request.notFound') }); return; }
    if (user.role === 'endUser' && (wr as any).userId !== user.id) { res.status(403).json({ message: t(lang, 'request.notAuthorised') }); return; }
    if (user.role === 'serviceProvider') {
      const accepted = await pAny.acceptedProvider?.findFirst?.({ where: { workRequestId: id, providerId: user.id } });
      if (!accepted) { res.status(403).json({ message: t(lang, 'request.notAuthorised') }); return; }
    }
    const full = await buildFullWorkRequest(id);
    res.json(full);
  } catch (e) {
    console.error('getById error', e);
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'request.fetchFailed') });
  }
}

/**
 * Accept a work request.  Only service providers can accept requests.
 * Once accepted the provider is added to the request’s list.  A
 * notification is sent to the end user to inform them of the provider.
 */
export async function accept(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'serviceProvider') { res.status(403).json({ message: t(lang, 'request.accept.onlyProviders') }); return; }
  const { id } = req.params;
  try {
    const providerInfo = await pAny.serviceProviderInfo?.findUnique?.({ where: { userId: user.id } });
    if (!providerInfo) { res.status(400).json({ message: t(lang, 'request.accept.providerProfileIncomplete') }); return; }
    const wr = await pAny.workRequest.findUnique({ where: { id } });
    if (!wr) { res.status(404).json({ message: t(lang, 'request.notFound') }); return; }
    if (!providerInfo.services.includes((wr as any).service)) { res.status(403).json({ message: t(lang, 'request.accept.notEligible') }); return; }
    const already = await pAny.acceptedProvider?.findFirst?.({ where: { workRequestId: id, providerId: user.id } });
    if (already) { res.status(409).json({ message: t(lang, 'request.accept.alreadyAccepted') }); return; }
    await pAny.acceptedProvider?.create?.({ data: { workRequestId: id, providerId: user.id } });
    
    // Send push notification to the end user
    try {
      await sendNotificationToUser((wr as any).userId, {
        title: '✅ Request Accepted',
        body: `${user.name} accepted your request: ${(wr as any).service}`,
        data: {
          type: 'status_update',
          workRequestId: id,
          status: 'ACCEPTED',
          providerId: user.id,
          action: 'view_details',
        },
      });
    } catch (error) {
      console.error('Error sending push notification for request acceptance:', error);
    }
    
    // Also send in-app notification (existing functionality)
    await notifyUser({
      userId: (wr as any).userId,
      type: 'requestAccepted',
      titleKey: 'notifications.providerAccepted.title',
      messageKey: 'notifications.providerAccepted.message',
      params: { name: user.name, service: (wr as any).service },
      data: { requestId: (wr as any).id, providerId: user.id }
    });
    const full = await buildFullWorkRequest(id);
    res.json(full);
  } catch { res.status(500).json({ message: t(lang, 'request.accept.failed') }); }
}

/**
 * Close a work request and optionally record a rating.  Only the end
 * user who created the request can close it.  Providers remain visible
 * for future reference.  The request status is changed to 'closed'.
 */
export async function close(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const lang = getReqLang(req);
    if (user.role !== 'endUser') { res.status(403).json({ message: t(lang, 'request.close.onlyEndUsers') }); return; }
    const { id } = req.params;
    const { providerId, stars, review } = req.body as any;
    const wr = await pAny.workRequest.findFirst({ where: { id, userId: user.id } });
    if (!wr) { res.status(404).json({ message: t(lang, 'request.notFound') }); return; }
    if ((wr as any).status === 'closed') { res.status(409).json({ message: t(lang, 'request.close.alreadyClosed') }); return; }

    await pAny.workRequest.update({ where: { id }, data: { status: 'closed', closedAt: new Date() } });

    if (providerId && stars !== undefined) {
      const s = Number(stars);
      if (!Number.isInteger(s) || s < 1 || s > 5) { res.status(400).json({ message: t(lang, 'request.close.invalidStarRating') }); return; }
      // Optional: ensure providerId actually accepted this request
      const accepted = await pAny.acceptedProvider.findFirst({ where: { workRequestId: id, providerId } });
      if (!accepted) { res.status(400).json({ message: t(lang, 'request.close.providerDidNotAccept') }); return; }
      try {
        await pAny.rating?.create?.({ data: { workRequestId: id, providerId, stars: s, review } });
      } catch (err) {
        console.warn('rating create failed, ignoring', err);
      }
    }

    const full = await buildFullWorkRequest(id);
    res.json(full);
  } catch (e) {
    console.error('close error', e);
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'request.close.failed') });
  }
}