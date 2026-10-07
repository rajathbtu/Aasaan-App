import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { areValidTags } from '../utils/validation';
import { pushNotification } from '../models/dataStore';
import { getReqLang, t, notifyUser } from '../utils/i18n';
import { getServices } from '../utils/serviceCache';

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
  serviceName?: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  tags?: string[];
  createdAt?: Date;
  status?: string;
  boosted?: boolean;
  acceptedProviders?: any[];
  selectedProviderId?: string | null;
  closedAt?: Date | null;
  [key: string]: any; // allow forward compatibility
}

async function getServiceMap(serviceIds: string[]): Promise<Map<string, any>> {
  if (!serviceIds.length || !pAny.service?.findMany) return new Map();
  const services = await getServices();
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  return new Map(serviceIds.map((id) => [id, serviceMap.get(id)]));
}

// Build a full work request object with related entities via separate queries (avoids problematic includes)
async function buildFullWorkRequest(id: string, existingRequest?: any): Promise<FullWorkRequest | null> {
  const wr = existingRequest || await pAny.workRequest.findUnique({ where: { id } });
  if (!wr) return null;
  const [acceptedProviders, serviceMap] = await Promise.all([
    pAny.acceptedProvider?.findMany ? pAny.acceptedProvider.findMany({ where: { workRequestId: id } }) : [],
    getServiceMap((wr as any).service ? [(wr as any).service] : []),
  ]);

  // Enrich accepted providers with user profile (name, phone, picUrl)
  let acceptedWithDetails: any[] = acceptedProviders || [];
  try {
    const ids = Array.from(new Set((acceptedProviders || []).map((p: any) => p.providerId)));
    if (ids.length && pAny.user?.findMany) {
      const users = await pAny.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          picUrl: true,
          picModeration: true,
          createdAt: true,
          aadhaarVerified: true,
          ratingsScoreSum: true,
          ratingsCount: true,
          serviceProviderInfo: {
            select: {
              workSinceYear: true,
              birthYear: true,
              gender: true,
              bio: true,
              location: {
                select: {
                  lat: true,
                  lng: true,
                },
              },
            },
          },
        },
      });
      const uMap = new Map(users.map((u: any) => [u.id, u]));
      acceptedWithDetails = (acceptedProviders || []).map((p: any) => ({
        ...p,
        provider: (() => {
          const provider = uMap.get(p.providerId) as any;
          if (!provider) return null;
          const { ratingsScoreSum, ratingsCount, picModeration, ...profile } = provider;
          return {
            ...profile,
            picUrl: picModeration === 'approved' ? profile.picUrl : null,
            providerRating: {
                                average: ratingsCount > 0 ? ratingsScoreSum / ratingsCount : null,
                                count: ratingsCount,
                              },
          };
        })(),
      }));
    }
  } catch {}

  return {
    ...(wr as any),
    acceptedProviders: acceptedWithDetails,
    serviceName: serviceMap.get((wr as any).service)?.name || (wr as any).service,
  } as FullWorkRequest;
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
  const { service, location, tags, phoneConsent } = req.body as any;
  if (!service || typeof service !== 'string') { res.status(400).json({ message: t(lang, 'request.serviceRequired') }); return; }
  if (!location || typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number') { res.status(400).json({ message: t(lang, 'user.invalidLocation') }); return; }
  if (tags && !areValidTags(tags)) { res.status(400).json({ message: t(lang, 'request.invalidTags') }); return; }
  if (phoneConsent !== undefined && typeof phoneConsent !== 'boolean') { res.status(400).json({ message: 'phoneConsent must be a boolean.' }); return; }
  try {
    const since = new Date(Date.now() - 24*60*60*1000);
    const recent = await prisma.workRequest.count({ where: { userId: user.id, createdAt: { gt: since } } });
    if (recent >= 40 && !req.body.force) { res.status(429).json({ message: t(lang, 'request.limitReached'), code: 'LIMIT_EXCEEDED' }); return; }
    const wr = await pAny.workRequest.create({
      data: {
        userId: user.id,
        service,
        locationName: location.name,
        locationLat: location.lat,
        locationLng: location.lng,
        tags: tags || [],
        phoneConsent: phoneConsent === true,
      },
    });
    // Notify eligible providers (service match + radius parity)
    const providers = await pAny.serviceProviderInfo?.findMany?.({ where: { services: { has: service }, user: { role: 'serviceProvider' }, }, include: { location: true }, }) || [];
    for (const p of providers) {
      let notify = true;
      if (p.location && p.radius > 0) {
        const d = distanceKm(location.lat, location.lng, p.location.lat, p.location.lng);
        notify = d <= p.radius;
      }
      if (notify) {
        await notifyUser({
          userId: p.userId,
          type: 'newRequest',
          titleKey: 'notifications.newRequest.title',
          messageKey: 'notifications.newRequest.message',
          params: { name: user.name, service, location: location.name },
          data: { requestId: wr.id }
        }).catch((error) => console.error('Failed to create provider notification:', error));
      }
    }
    const serviceDetails = (await getServiceMap([service])).get(service);
    res.status(201).json({
      ...wr,
      serviceName: serviceDetails?.name || service,
      serviceIcon: serviceDetails?.icon || null,
      serviceColor: serviceDetails?.color || null,
    });
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
    const requestedStatus = req.query.status;
    const status = requestedStatus === 'active' || requestedStatus === 'closed'
      ? requestedStatus
      : undefined;
    const [requests, activeCount, completedCount] = await Promise.all([
      pAny.workRequest.findMany({
        where: { userId: user.id, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          service: true,
          locationName: true,
          tags: true,
          createdAt: true,
          status: true,
          boosted: true,
        },
      }),
      pAny.workRequest.count({ where: { userId: user.id, status: 'active' } }),
      pAny.workRequest.count({ where: { userId: user.id, status: 'closed' } }),
    ]);
    const counts = { active: activeCount, completed: completedCount };
    const requestIds = (requests as any[]).map((request: any) => request.id);
    let responseCountsMap = new Map<string, number>();
    if (requestIds.length && pAny.acceptedProvider?.groupBy) {
      const responseCounts = await pAny.acceptedProvider.groupBy({
        by: ['workRequestId'],
        where: { workRequestId: { in: requestIds } },
        _count: { _all: true },
      });
      responseCountsMap = new Map(
        responseCounts.map((entry: any) => [entry.workRequestId, entry._count._all || 0])
      );
    }
    // Enrich requests with location and service metadata for client display.
    try {
      const serviceIds = Array.from(new Set((requests as any[]).map((request: any) => request.service).filter(Boolean)));
      const serviceItems = await getServiceMap(serviceIds);
      const enriched = (requests as any[]).map((request: any) => {
        const service = serviceItems.get(request.service);
        return {
          ...request,
          serviceName: service?.name || request.service,
          serviceIcon: service?.icon || null,
          serviceColor: service?.color || null,
          responseCount: responseCountsMap.get(request.id) || 0,
        };
      });
      res.json({
        requests: enriched,
        counts,
      });
      return;
    } catch (error) {
      console.error('Failed to enrich work requests', error);
    }
    res.json({
      requests,
      counts,
    });
    return;
  }
  // Fetch recent requests accepted by this provider & with closed status now
  if (req.query.status === 'closed') {
    try {
      const requests = await pAny.workRequest.findMany({
        where: {
          status: 'closed',
          createdAt: { gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
          acceptedProviders: { some: { providerId: user.id } },
        },
        orderBy: { closedAt: 'desc' },
        take: 50,
        include: {
          user: { select: { name: true, picUrl: true, picModeration: true } },
          ratings: {
            where: { submittedByUserId: user.id },
            select: { id: true },
          },
        },
      });
      const serviceMap = await getServiceMap(Array.from(new Set(requests.map((request: any) => request.service))));
      res.json(requests.map(({ ratings, user: endUser, ...request }: any) => {
        const service = serviceMap.get(request.service);
        return {
          ...request,
          serviceName: service?.name || request.service,
          serviceIcon: service?.icon || null,
          serviceColor: service?.color || null,
          endUserName: endUser.name,
          endUserPicUrl: endUser.picModeration === 'approved' ? endUser.picUrl : null,
          canRateEndUser: request.selectedProviderId === user.id && ratings.length === 0,
        };
      }));
    } catch (error) {
      console.error('Failed to fetch closed work requests', error);
      res.status(500).json({ message: t(getReqLang(req), 'request.fetchFailed') });
    }
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
      const earthRadius = 6371000; // meters
      const latDelta = (radiusInMeters / earthRadius) * (180 / Math.PI);
      const lngDelta =
        (radiusInMeters /
          (earthRadius * Math.cos((providerLoc.lat * Math.PI) / 180))) *
        (180 / Math.PI);

      const minLat = providerLoc.lat - latDelta;
      const maxLat = providerLoc.lat + latDelta;
      const minLng = providerLoc.lng - lngDelta;
      const maxLng = providerLoc.lng + lngDelta;


      if (!services.length) {
        res.json([]);
        return;
      }

      const relevantRequests = (await prisma.$queryRaw`
        SELECT wr.*,
               s.name AS service_name,
               s.icon AS service_icon,
               s.color AS service_color,
               wr."locationName" AS location_name,
               wr."locationLat" AS location_lat,
               wr."locationLng" AS location_lng,
               usr.name AS end_user_name,
               CASE WHEN wr."phoneConsent" IS TRUE THEN usr."phoneNumber" ELSE NULL END AS end_user_phone,
               CASE WHEN usr."pic_moderation" = 'approved' THEN usr."picUrl" ELSE NULL END AS end_user_pic_url,
               CASE WHEN ap.id IS NULL THEN false ELSE true END AS accepted_by_provider
        FROM "WorkRequest" wr
        JOIN "User" usr ON wr."userId" = usr."id"
        LEFT JOIN "AcceptedProvider" ap
          ON ap."workRequestId" = wr."id"
         AND ap."providerId" = ${user.id}
        LEFT JOIN "Service" s ON s."id" = wr."service"
        WHERE wr."status" = 'active'
          AND wr."service" = ANY(${services})
          AND wr."locationLat" BETWEEN ${minLat} AND ${maxLat}
          AND wr."locationLng" BETWEEN ${minLng} AND ${maxLng}
          AND ST_DistanceSphere(
            ST_MakePoint(${providerLoc.lng}, ${providerLoc.lat}),
            ST_MakePoint(wr."locationLng", wr."locationLat")
          ) <= ${radiusInMeters}
        ORDER BY wr."createdAt" DESC
        LIMIT 50;
      `) as any[];

      const enrichedRequests = relevantRequests.map((request: any) => {
        const {
          accepted_by_provider,
          service_name,
          service_icon,
          service_color,
          location_name,
          location_lat,
          location_lng,
          end_user_name,
          end_user_phone,
          end_user_pic_url,
          ...rest
        } = request;

        return {
          ...rest,
          acceptedByProvider: !!accepted_by_provider,
          serviceName: service_name || null,
          serviceIcon: service_icon || null,
          serviceColor: service_color || null,
          locationName: location_name || null,
          locationLat: location_lat || null,
          locationLng: location_lng || null,
          endUserName: end_user_name || null,
          endUserPhone: end_user_phone || null,
          endUserPicUrl: end_user_pic_url || null,
        };
      });

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
    const full = await buildFullWorkRequest(id, wr);
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
    if ((wr as any).userId === user.id) { res.status(403).json({ message: t(lang, 'request.accept.notEligible') }); return; }
    if (!providerInfo.services.includes((wr as any).service)) { res.status(403).json({ message: t(lang, 'request.accept.notEligible') }); return; }
    const already = await pAny.acceptedProvider?.findFirst?.({ where: { workRequestId: id, providerId: user.id } });
    if (already) { res.status(409).json({ message: t(lang, 'request.accept.alreadyAccepted') }); return; }
    await pAny.acceptedProvider?.create?.({ data: { workRequestId: id, providerId: user.id } });
    await notifyUser({
      userId: (wr as any).userId,
      type: 'requestAccepted',
      titleKey: 'notifications.providerAccepted.title',
      messageKey: 'notifications.providerAccepted.message',
      params: { name: user.name, service: (wr as any).service },
      data: { requestId: (wr as any).id, providerId: user.id }
    });
    res.status(204).end();
  } catch { res.status(500).json({ message: t(lang, 'request.accept.failed') }); }
}

export async function undoAccept(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'serviceProvider') {
    res.status(403).json({ message: t(lang, 'request.undoAccept.onlyProviders') });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const requests = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT "id", "status"
        FROM "WorkRequest"
        WHERE "id" = ${req.params.id}
        FOR UPDATE
      `;
      const request = requests[0];
      if (!request) return 'notFound';
      if (request.status !== 'active') return 'closed';

      await tx.acceptedProvider.deleteMany({
        where: { workRequestId: request.id, providerId: user.id },
      });
      return 'withdrawn';
    });

    if (result === 'notFound') {
      res.status(404).json({ message: t(lang, 'request.notFound') });
      return;
    }
    if (result === 'closed') {
      res.status(409).json({ message: t(lang, 'request.close.alreadyClosed') });
      return;
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ message: t(lang, 'request.undoAccept.failed') });
  }
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
    const { providerId, stars: rating, review } = req.body as any;
    if (providerId !== undefined && (typeof providerId !== 'string' || !providerId)) {
      res.status(400).json({ message: t(lang, 'request.close.providerDidNotAccept') });
      return;
    }
    if (rating !== undefined && (!providerId || typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)) {
      res.status(400).json({ message: t(lang, 'request.close.invalidStarRating') });
      return;
    }
    const closed = await prisma.$transaction(async (tx) => {
      const requests = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT "id", "status"
        FROM "WorkRequest"
        WHERE "id" = ${id} AND "userId" = ${user.id}
        FOR UPDATE
      `;
      const request = requests[0];
      if (!request) return 'notFound';
      if (request.status === 'closed') return 'alreadyClosed';

      if (providerId) {
        const accepted = await tx.acceptedProvider.findFirst({
          where: { workRequestId: id, providerId },
        });
        if (!accepted) return 'providerDidNotAccept';
      }

      const update = await tx.workRequest.updateMany({
        where: { id, userId: user.id, status: 'active' },
        data: { status: 'closed', closedAt: new Date(), selectedProviderId: providerId || null },
      });
      if (update.count !== 1) return 'alreadyClosed';
      if (rating !== undefined && providerId) {
        await tx.rating.create({
          data: {
            workRequestId: id,
            submittedByUserId: user.id,
            ratedUserId: providerId,
            stars: rating,
            review: typeof review === 'string' ? review : undefined,
          },
        });
        await tx.user.update({
          where: { id: providerId },
          data: { ratingsScoreSum: { increment: rating }, ratingsCount: { increment: 1 } },
        });
      }
      return 'closed';
    });
    if (closed === 'notFound') { res.status(404).json({ message: t(lang, 'request.notFound') }); return; }
    if (closed === 'alreadyClosed') { res.status(409).json({ message: t(lang, 'request.close.alreadyClosed') }); return; }
    if (closed === 'providerDidNotAccept') {
      res.status(400).json({ message: t(lang, 'request.close.providerDidNotAccept') });
      return;
    }

    const full = await buildFullWorkRequest(id);
    res.json(full);
  } catch (e) {
    console.error('close error', e);
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'request.close.failed') });
  }
}

export async function rateEndUser(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'serviceProvider') {
    res.status(403).json({ message: t(lang, 'request.rate.onlyProviders') });
    return;
  }

  const { id } = req.params;
  const stars = (req.body as any)?.stars;
  const review = (req.body as any)?.review;
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    res.status(400).json({ message: t(lang, 'request.close.invalidStarRating') });
    return;
  }

  try {
    const request = await pAny.workRequest.findUnique({ where: { id } });
    if (!request) { res.status(404).json({ message: t(lang, 'request.notFound') }); return; }
    if (request.status !== 'closed') {
      res.status(409).json({ message: t(lang, 'request.rate.mustBeClosed') });
      return;
    }
    if (request.selectedProviderId !== user.id) {
      res.status(403).json({ message: t(lang, 'request.rate.notSelected') });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const eligibleRequest = await tx.workRequest.findFirst({
        where: {
          id,
          status: 'closed',
          selectedProviderId: user.id,
          acceptedProviders: { some: { providerId: user.id } },
          ratings: { none: { submittedByUserId: user.id } },
        },
        select: { userId: true },
      });
      if (!eligibleRequest) return null;
      await tx.rating.create({
        data: {
          workRequestId: id,
          submittedByUserId: user.id,
          ratedUserId: eligibleRequest.userId,
          stars,
          review: typeof review === 'string' ? review : undefined,
        },
      });
      await tx.user.update({
        where: { id: eligibleRequest.userId },
        data: { ratingsScoreSum: { increment: stars }, ratingsCount: { increment: 1 } },
      });
      return true;
    });
    if (!result) {
      res.status(409).json({ message: t(lang, 'request.rate.alreadyRated') });
      return;
    }

    res.status(204).end();
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ message: t(lang, 'request.rate.alreadyRated') });
      return;
    }
    console.error('rateEndUser error', error);
    res.status(500).json({ message: t(lang, 'request.rate.failed') });
  }
}