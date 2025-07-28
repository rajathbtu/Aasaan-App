import { Request, Response } from 'express';
import { workRequests, users, pushNotification } from '../models/dataStore';

/**
 * Handle work request boosting.  The authenticated end user can boost
 * their request by paying with money or credit points.  On success the
 * request is marked as boosted and the user’s credit points are
 * deducted.  In a real app this endpoint would integrate with a
 * payment gateway.
 */
export function boostWorkRequest(req: Request, res: Response): void {
  const user = (req as any).user;
  if (user.role !== 'endUser') {
    return res.status(403).json({ message: 'Only end users can boost requests' });
  }
  const { requestId, useCredits } = req.body as { requestId: string; useCredits?: boolean };
  const wr = workRequests.find(w => w.id === requestId && w.userId === user.id);
  if (!wr) return res.status(404).json({ message: 'Work request not found' });
  if (wr.boosted) {
    return res.status(409).json({ message: 'Work request is already boosted' });
  }
  const cost = 100; // INR
  const costPoints = 100; // points equivalent
  if (useCredits) {
    if (user.creditPoints < costPoints) {
      return res.status(400).json({ message: 'Insufficient credit points' });
    }
    user.creditPoints -= costPoints;
  } else {
    // Here you would process payment via a gateway
    // For demonstration we assume payment is successful
  }
  wr.boosted = true;
  // Optionally notify providers that this request is boosted
  pushNotification({
    userId: user.id,
    type: 'boostPromotion',
    title: 'Your request has been boosted',
    message: 'Your work request will now appear at the top of provider feeds.',
    data: { requestId: wr.id },
  });
  res.json(wr);
}

/**
 * Subscribe the authenticated service provider to a professional plan.
 * Expects a plan type ('basic' or 'pro') and optional use of credit
 * points.  Updates the user’s plan and deducts credit points if used.
 */
export function subscribePlan(req: Request, res: Response): void {
  const user = (req as any).user;
  if (user.role !== 'serviceProvider') {
    return res.status(403).json({ message: 'Only service providers can subscribe' });
  }
  const { plan, useCredits } = req.body as { plan: 'basic' | 'pro'; useCredits?: boolean };
  const cost = plan === 'basic' ? 100 : 200; // INR per month
  const costPoints = cost; // 1 point = ₹1
  if (useCredits) {
    if (user.creditPoints < costPoints) {
      return res.status(400).json({ message: 'Insufficient credit points' });
    }
    user.creditPoints -= costPoints;
  } else {
    // Simulate payment success
  }
  user.plan = plan;
  // Notify user of subscription
  pushNotification({
    userId: user.id,
    type: 'planPromotion',
    title: 'Subscription Successful',
    message: `You have subscribed to the ${plan} plan. Enjoy your benefits!`,
    data: { plan },
  });
  res.json(user);
}