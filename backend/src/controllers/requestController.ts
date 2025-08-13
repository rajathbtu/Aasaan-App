import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { areValidTags } from '../utils/validation';
import { pushNotification } from '../models/dataStore';

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
  if (user.role !== 'endUser') { res.status(403).json({ message: 'Only end users can create work requests' }); return; }
  const { service, location, tags } = req.body as any;
  if (!service || typeof service !== 'string') { res.status(400).json({ message: 'Service is required' }); return; }
  if (!location || typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number') { res.status(400).json({ message: 'Invalid location' }); return; }
  if (tags && !areValidTags(tags)) { res.status(400).json({ message: 'Invalid tags' }); return; }
  try {
    const since = new Date(Date.now() - 24*60*60*1000);
    const recent = await prisma.workRequest.count({ where: { userId: user.id, createdAt: { gt: since } } });
    if (recent >= 3 && !req.body.force) { res.status(429).json({ message: 'Work request limit reached', code: 'LIMIT_EXCEEDED' }); return; }
    const loc = await pAny.location.create?.({ data: { name: location.name, lat: location.lat, lng: location.lng } });
    const wr = await pAny.workRequest.create({ data: { userId: user.id, service, locationId: loc?.id, tags: tags || [] } });
    // Notify eligible providers (service match + radius parity)
    const providers = await pAny.serviceProviderInfo?.findMany?.({ where: { services: { has: service } }, include: { location: true } }) || [];
    for (const p of providers) {
      let notify = true;
      if (p.location && p.radius > 0 && loc) {
        const d = distanceKm(loc.lat, loc.lng, p.location.lat, p.location.lng);
        notify = d <= p.radius;
      }
      if (notify) {
        await pushNotification({
            userId: p.userId,
            type: 'newRequest',
            title: 'New Work Opportunity Nearby!',
            message: `${user.name} is looking for your service. Don't miss out!`,
            data: { requestId: wr.id }
        });
      }
    }
    res.status(201).json(wr);
  } catch { res.status(500).json({ message: 'Create failed' }); }
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
  if (!providerInfo) { res.json([]); return; }
  const services: string[] = providerInfo.services || [];
  const active = await pAny.workRequest.findMany({ where: { status: 'active', service: { in: services } } });
  if (providerInfo.locationId && providerInfo.radius > 0) {
    const providerLoc = await pAny.location?.findUnique?.({ where: { id: providerInfo.locationId } });
    if (providerLoc) {
      const locationIds = Array.from(new Set(active.map((r: any) => r.locationId).filter(Boolean)));
      const locations = await pAny.location?.findMany?.({ where: { id: { in: locationIds } } }) || [];
      const locMap = new Map(locations.map((l: any) => [l.id, l]));
      const filtered = active.filter((r: any) => {
        const loc: any = locMap.get(r.locationId);
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
        const d = distanceKm(providerLoc.lat, providerLoc.lng, loc.lat, loc.lng);
        return d <= providerInfo.radius;
      });
      res.json(filtered);
      return;
    }
  }
  res.json(active);
}

/**
 * Get details of a specific work request.  The request is visible to its
 * owner and to providers who have accepted it.  Other users receive a
 * 403.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const wr = await pAny.workRequest.findUnique({ where: { id } });
    if (!wr) { res.status(404).json({ message: 'Work request not found' }); return; }
    if (user.role === 'endUser' && (wr as any).userId !== user.id) { res.status(403).json({ message: 'Not authorised' }); return; }
    if (user.role === 'serviceProvider') {
      const accepted = await pAny.acceptedProvider?.findFirst?.({ where: { workRequestId: id, providerId: user.id } });
      if (!accepted) { res.status(403).json({ message: 'Not authorised' }); return; }
    }
    const full = await buildFullWorkRequest(id);
    res.json(full);
  } catch (e) {
    console.error('getById error', e);
    res.status(500).json({ message: 'Failed to fetch work request' });
  }
}

/**
 * Accept a work request.  Only service providers can accept requests.
 * Once accepted the provider is added to the request’s list.  A
 * notification is sent to the end user to inform them of the provider.
 */
export async function accept(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (user.role !== 'serviceProvider') { res.status(403).json({ message: 'Only service providers can accept requests' }); return; }
  const { id } = req.params;
  try {
    const providerInfo = await pAny.serviceProviderInfo?.findUnique?.({ where: { userId: user.id } });
    if (!providerInfo) { res.status(400).json({ message: 'Provider profile incomplete' }); return; }
    const wr = await pAny.workRequest.findUnique({ where: { id } });
    if (!wr) { res.status(404).json({ message: 'Work request not found' }); return; }
    if (!providerInfo.services.includes((wr as any).service)) { res.status(403).json({ message: 'Not eligible for this request' }); return; }
    const already = await pAny.acceptedProvider?.findFirst?.({ where: { workRequestId: id, providerId: user.id } });
    if (already) { res.status(409).json({ message: 'Already accepted' }); return; }
    await pAny.acceptedProvider?.create?.({ data: { workRequestId: id, providerId: user.id } });
    await pushNotification({
      userId: (wr as any).userId,
      type: 'requestAccepted',
      title: 'Provider Accepted Your Request',
      message: `${user.name} (${(wr as any).service}) has accepted your work request. You can now contact them directly.`,
      data: { requestId: (wr as any).id, providerId: user.id }
    });
    const full = await buildFullWorkRequest(id);
    res.json(full);
  } catch { res.status(500).json({ message: 'Accept failed' }); }
}

/**
 * Close a work request and optionally record a rating.  Only the end
 * user who created the request can close it.  Providers remain visible
 * for future reference.  The request status is changed to 'closed'.
 */
export async function close(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    if (user.role !== 'endUser') { res.status(403).json({ message: 'Only end users can close requests' }); return; }
    const { id } = req.params;
    const { providerId, stars, review } = req.body as any;
    const wr = await pAny.workRequest.findFirst({ where: { id, userId: user.id } });
    if (!wr) { res.status(404).json({ message: 'Work request not found' }); return; }
    if ((wr as any).status === 'closed') { res.status(409).json({ message: 'Already closed' }); return; }

    await pAny.workRequest.update({ where: { id }, data: { status: 'closed', closedAt: new Date() } });

    if (providerId && stars !== undefined) {
      const s = Number(stars);
      if (!Number.isInteger(s) || s < 1 || s > 5) { res.status(400).json({ message: 'Invalid star rating (1-5)' }); return; }
      // Optional: ensure providerId actually accepted this request
      const accepted = await pAny.acceptedProvider.findFirst({ where: { workRequestId: id, providerId } });
      if (!accepted) { res.status(400).json({ message: 'Selected provider did not accept this request' }); return; }
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
    res.status(500).json({ message: 'Close failed' });
  }
}