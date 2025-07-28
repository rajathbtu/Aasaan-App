import { Request, Response } from 'express';
import { WorkRequest } from '../models/WorkRequest';
import { workRequests, createWorkRequest, notifications, users, pushNotification } from '../models/dataStore';
import { areValidTags } from '../utils/validation';
import { Location } from '../models/User';

/**
 * Create a new work request on behalf of an end user.  Validates the input
 * and enforces a simple quota of 3 requests per 24 hours.  If the quota is
 * exceeded the client is expected to handle payment before creating
 * additional requests.  After creation the request is broadcast to
 * eligible service providers via a notification (simplified).
 */
export function create(req: Request, res: Response): void {
  const user = (req as any).user;
  if (user.role !== 'endUser') {
    return res.status(403).json({ message: 'Only end users can create work requests' });
  }
  const { service, location, tags } = req.body as {
    service: string;
    location: { name: string; lat: number; lng: number };
    tags: string[];
  };
  if (!service || typeof service !== 'string') {
    return res.status(400).json({ message: 'Service is required' });
  }
  if (!location || typeof location.name !== 'string' || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return res.status(400).json({ message: 'Invalid location' });
  }
  if (tags && !areValidTags(tags)) {
    return res.status(400).json({ message: 'Invalid tags' });
  }
  // Limit number of requests in the last 24 hours
  const now = Date.now();
  const recentRequests = workRequests.filter(
    wr => wr.userId === user.id && now - wr.createdAt.getTime() < 24 * 60 * 60 * 1000
  );
  if (recentRequests.length >= 3 && !req.body.force) {
    return res.status(429).json({ message: 'Work request limit reached', code: 'LIMIT_EXCEEDED' });
  }
  const wr = createWorkRequest({
    userId: user.id,
    service,
    location: { name: location.name, lat: location.lat, lng: location.lng },
    tags: tags || [],
  });
  // Notify eligible providers (simplified: providers with matching service)
  users.forEach(provider => {
    if (provider.role === 'serviceProvider' && provider.serviceProviderInfo) {
      if (provider.serviceProviderInfo.services.includes(service)) {
        // Check radius distance – simplified: we don’t calculate actual distance
        pushNotification({
          userId: provider.id,
          type: 'newRequest',
          title: 'New Work Opportunity Nearby!',
          message: `${user.name} is looking for your service. Don't miss out!`,
          data: { requestId: wr.id },
        });
      }
    }
  });
  res.status(201).json(wr);
}

/**
 * List work requests relevant to the authenticated user.  End users see
 * their own requests.  Service providers see active requests for which
 * they are eligible (matching service and within radius).
 */
export function list(req: Request, res: Response): void {
  const user = (req as any).user;
  if (user.role === 'endUser') {
    const myRequests = workRequests.filter(wr => wr.userId === user.id);
    return res.json(myRequests);
  } else {
    // Service provider view
    const serviceProviderInfo = user.serviceProviderInfo;
    if (!serviceProviderInfo) {
      return res.json([]);
    }
    const eligible = workRequests.filter(wr => {
      if (wr.status !== 'active') return false;
      if (!serviceProviderInfo.services.includes(wr.service)) return false;
      // Simplified distance check: in a real system compute actual geo
      // distance.  Here we include all requests.
      return true;
    });
    return res.json(eligible);
  }
}

/**
 * Get details of a specific work request.  The request is visible to its
 * owner and to providers who have accepted it.  Other users receive a
 * 403.
 */
export function getById(req: Request, res: Response): void {
  const user = (req as any).user;
  const { id } = req.params;
  const wr = workRequests.find(wr => wr.id === id);
  if (!wr) return res.status(404).json({ message: 'Work request not found' });
  if (user.role === 'endUser' && wr.userId !== user.id) {
    return res.status(403).json({ message: 'Not authorised' });
  }
  if (user.role === 'serviceProvider' && !wr.acceptedProviders.some(p => p.providerId === user.id)) {
    // Providers can view details of accepted requests only
    return res.status(403).json({ message: 'Not authorised' });
  }
  res.json(wr);
}

/**
 * Accept a work request.  Only service providers can accept requests.
 * Once accepted the provider is added to the request’s list.  A
 * notification is sent to the end user to inform them of the provider.
 */
export function accept(req: Request, res: Response): void {
  const user = (req as any).user;
  if (user.role !== 'serviceProvider') {
    return res.status(403).json({ message: 'Only service providers can accept requests' });
  }
  const { id } = req.params;
  const wr = workRequests.find(wr => wr.id === id);
  if (!wr) return res.status(404).json({ message: 'Work request not found' });
  // Check if already accepted
  if (wr.acceptedProviders.some(p => p.providerId === user.id)) {
    return res.status(409).json({ message: 'You have already accepted this request' });
  }
  // Check eligibility: service and radius.  Simplified distance check
  if (!user.serviceProviderInfo || !user.serviceProviderInfo.services.includes(wr.service)) {
    return res.status(403).json({ message: 'Not eligible for this request' });
  }
  wr.acceptedProviders.push({ providerId: user.id, acceptedAt: new Date() });
  // Send notification to end user
  pushNotification({
    userId: wr.userId,
    type: 'requestAccepted',
    title: 'Provider Accepted Your Request',
    message: `${user.name} (${wr.service}) has accepted your work request. You can now contact them directly.`,
    data: { requestId: wr.id, providerId: user.id },
  });
  res.json(wr);
}

/**
 * Close a work request and optionally record a rating.  Only the end
 * user who created the request can close it.  Providers remain visible
 * for future reference.  The request status is changed to 'closed'.
 */
export function close(req: Request, res: Response): void {
  const user = (req as any).user;
  if (user.role !== 'endUser') {
    return res.status(403).json({ message: 'Only end users can close requests' });
  }
  const { id } = req.params;
  const { providerId, stars, review } = req.body as {
    providerId?: string;
    stars?: number;
    review?: string;
  };
  const wr = workRequests.find(wr => wr.id === id && wr.userId === user.id);
  if (!wr) return res.status(404).json({ message: 'Work request not found' });
  if (wr.status === 'closed') {
    return res.status(409).json({ message: 'Request already closed' });
  }
  wr.status = 'closed';
  wr.closedAt = new Date();
  if (providerId && stars) {
    wr.rating = { providerId, stars, review };
    // Award credit points to provider for good ratings
    const provider = users.find(u => u.id === providerId);
    if (provider) {
      if (stars === 5) {
        provider.creditPoints += 10;
      }
      // Send notification to provider thanking them
      pushNotification({
        userId: provider.id,
        type: 'ratingPrompt',
        title: 'You received a rating',
        message: `${user.name} rated you ${stars} stars${review ? ' with a comment' : ''}.`,
        data: { requestId: wr.id },
      });
    }
  }
  res.json(wr);
}