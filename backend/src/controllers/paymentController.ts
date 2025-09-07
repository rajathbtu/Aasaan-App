import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getReqLang, t, notifyUser } from '../utils/i18n';
import { createOrder, verifyPaymentSignature, getPaymentDetails } from '../utils/razorpay';
import { trackCustomEvent, trackError } from '../utils/analytics';

export async function boostWorkRequest(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'endUser') { res.status(403).json({ message: t(lang, 'payment.onlyEndUsers') }); return; }
  const { requestId, useCredits } = req.body as { requestId: string; useCredits?: boolean };
  
  // Track boost request attempt
  trackCustomEvent(user.id, 'boost_request_attempted_backend', {
    request_id: requestId,
    payment_method: useCredits ? 'credits' : 'unknown',
    user_role: user.role
  });
  
  try {
    const wr = await prisma.workRequest.findFirst({ where: { id: requestId, userId: user.id } });
    if (!wr) { 
      // Track request not found
      trackCustomEvent(user.id, 'boost_request_not_found', {
        request_id: requestId
      });
      
      res.status(404).json({ message: t(lang, 'request.notFound') }); 
      return; 
    }
    if (wr.boosted) { 
      // Track already boosted
      trackCustomEvent(user.id, 'boost_request_already_boosted', {
        request_id: requestId
      });
      
      res.status(409).json({ message: t(lang, 'payment.alreadyBoosted') }); 
      return; 
    }
    
    const costPoints = 100;
    if (useCredits) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) { res.status(404).json({ message: t(lang, 'user.notFound') }); return; }
      
      if (dbUser.creditPoints < costPoints) { 
        // Track insufficient credits
        trackCustomEvent(user.id, 'boost_insufficient_credits', {
          request_id: requestId,
          user_credits: dbUser.creditPoints,
          required_credits: costPoints
        });
        
        res.status(400).json({ message: t(lang, 'payment.insufficientCredits') }); 
        return; 
      }
      
      await prisma.user.update({ where: { id: user.id }, data: { creditPoints: { decrement: costPoints } } });
      
      // Track credit payment
      trackCustomEvent(user.id, 'boost_paid_with_credits', {
        request_id: requestId,
        credits_spent: costPoints,
        credits_remaining: dbUser.creditPoints - costPoints
      });
    }
    
    const updatedWr = await prisma.workRequest.update({ where: { id: wr.id }, data: { boosted: true } });
    
    // Track successful boost
    trackCustomEvent(user.id, 'work_request_boosted', {
      request_id: requestId,
      payment_method: useCredits ? 'credits' : 'unknown',
      service: wr.service
    });
    
    await notifyUser({
      userId: user.id,
      type: 'boostPromotion',
      titleKey: 'notifications.boosted.title',
      messageKey: 'notifications.boosted.message',
      data: { requestId: wr.id },
    });
    res.json(updatedWr);
  } catch (error: any) {
    // Track boost failure
    trackError(req, error?.message || 'Boost request failed', 'Boost Payment', 'high');
    
    res.status(500).json({ message: t(lang, 'payment.boostFailed') });
  }
}

// Create Razorpay order for boosting work request
export async function createBoostOrder(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  
  if (user.role !== 'endUser') { 
    res.status(403).json({ message: t(lang, 'payment.onlyEndUsers') }); 
    return; 
  }
  
  const { requestId } = req.body as { requestId: string };
  
  try {
    const wr = await prisma.workRequest.findFirst({ where: { id: requestId, userId: user.id } });
    if (!wr) { 
      res.status(404).json({ message: t(lang, 'request.notFound') }); 
      return; 
    }
    
    if (wr.boosted) { 
      res.status(409).json({ message: t(lang, 'payment.alreadyBoosted') }); 
      return; 
    }

    const amount = 10000; // ₹100 in paise
    const receipt = `boost_${requestId}_${Date.now()}`;
    
    const order = await createOrder({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        type: 'boost',
        requestId,
        userId: user.id,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error('Error creating boost order:', error);
    res.status(500).json({ message: t(lang, 'payment.orderCreationFailed') });
  }
}

// Verify payment and boost work request
export async function verifyBoostPayment(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    requestId 
  } = req.body;

  try {
    // Verify payment signature
    const isValidSignature = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      res.status(400).json({ message: t(lang, 'payment.invalidSignature') });
      return;
    }

    // Get payment details to verify status
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);
    
    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      res.status(400).json({ message: t(lang, 'payment.paymentNotSuccessful') });
      return;
    }

    // Verify the work request belongs to the user
    const wr = await prisma.workRequest.findFirst({ 
      where: { id: requestId, userId: user.id } 
    });
    
    if (!wr) { 
      res.status(404).json({ message: t(lang, 'request.notFound') }); 
      return; 
    }

    if (wr.boosted) { 
      res.status(409).json({ message: t(lang, 'payment.alreadyBoosted') }); 
      return; 
    }

    // Update work request to boosted
    const updatedWr = await prisma.workRequest.update({ 
      where: { id: wr.id }, 
      data: { boosted: true } 
    });

    // Store payment record (you might want to create a Payment model in Prisma)
    // For now, we'll add a note about successful payment
    await notifyUser({
      userId: user.id,
      type: 'boostPromotion',
      titleKey: 'notifications.boosted.title',
      messageKey: 'notifications.boosted.message',
      data: { requestId: wr.id, paymentId: razorpay_payment_id },
    });

    res.json({ 
      success: true, 
      workRequest: updatedWr,
      paymentId: razorpay_payment_id 
    });
  } catch (error) {
    console.error('Error verifying boost payment:', error);
    res.status(500).json({ message: t(lang, 'payment.verificationFailed') });
  }
}

export async function subscribePlan(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  if (user.role !== 'serviceProvider') { res.status(403).json({ message: t(lang, 'subscription.onlyProviders') }); return; }
  const { plan, useCredits } = req.body as { plan: 'basic' | 'pro'; useCredits?: boolean };
  const cost = plan === 'basic' ? 100 : 200;
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) { res.status(404).json({ message: t(lang, 'user.notFound') }); return; }
    if (useCredits) {
      if (dbUser.creditPoints < cost) { res.status(400).json({ message: t(lang, 'payment.insufficientCredits') }); return; }
      await prisma.user.update({ where: { id: user.id }, data: { creditPoints: { decrement: cost }, plan } });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { plan } });
    }
    await notifyUser({
      userId: user.id,
      type: 'planPromotion',
      titleKey: 'notifications.subscriptionSuccess.title',
      messageKey: 'notifications.subscriptionSuccess.message',
      params: { plan },
      data: { plan }
    });
    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    res.json(refreshed);
  } catch {
    res.status(500).json({ message: t(lang, 'subscription.failed') });
  }
}

// Create Razorpay order for subscription
export async function createSubscriptionOrder(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  
  if (user.role !== 'serviceProvider') { 
    res.status(403).json({ message: t(lang, 'subscription.onlyProviders') }); 
    return; 
  }
  
  const { plan } = req.body as { plan: 'basic' | 'pro' };
  
  if (!plan || !['basic', 'pro'].includes(plan)) {
    res.status(400).json({ message: t(lang, 'subscription.invalidPlan') });
    return;
  }

  try {
    const planPricing = {
      basic: 10000, // ₹100 in paise
      pro: 20000,   // ₹200 in paise
    };

    const amount = planPricing[plan];
    const receipt = `sub_${plan}_${user.id}_${Date.now()}`;
    
    const order = await createOrder({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        type: 'subscription',
        plan,
        userId: user.id,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      plan,
    });
  } catch (error) {
    console.error('Error creating subscription order:', error);
    res.status(500).json({ message: t(lang, 'payment.orderCreationFailed') });
  }
}

// Verify payment and update subscription
export async function verifySubscriptionPayment(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const lang = getReqLang(req);
  
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    plan 
  } = req.body;

  try {
    // Verify payment signature
    const isValidSignature = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      res.status(400).json({ message: t(lang, 'payment.invalidSignature') });
      return;
    }

    // Get payment details to verify status
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);
    
    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      res.status(400).json({ message: t(lang, 'payment.paymentNotSuccessful') });
      return;
    }

    // Verify plan validity
    if (!plan || !['basic', 'pro'].includes(plan)) {
      res.status(400).json({ message: t(lang, 'subscription.invalidPlan') });
      return;
    }

    // Update user subscription
    const updatedUser = await prisma.user.update({ 
      where: { id: user.id }, 
      data: { plan } 
    });

    // Send notification
    await notifyUser({
      userId: user.id,
      type: 'planPromotion',
      titleKey: 'notifications.subscriptionSuccess.title',
      messageKey: 'notifications.subscriptionSuccess.message',
      params: { plan },
      data: { plan, paymentId: razorpay_payment_id }
    });

    res.json({ 
      success: true, 
      user: updatedUser,
      paymentId: razorpay_payment_id 
    });
  } catch (error) {
    console.error('Error verifying subscription payment:', error);
    res.status(500).json({ message: t(lang, 'payment.verificationFailed') });
  }
}