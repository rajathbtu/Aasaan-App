import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { 
  boostWorkRequest, 
  subscribePlan,
  createBoostOrder,
  verifyBoostPayment,
  createSubscriptionOrder,
  verifySubscriptionPayment
} from '../controllers/paymentController';

const router = Router();

router.use(authenticate);

// Legacy endpoints (for credit-based payments)
router.post('/boost', boostWorkRequest);
router.post('/subscribe', subscribePlan);

// Razorpay integration endpoints
router.post('/create-boost-order', createBoostOrder);
router.post('/verify-boost-payment', verifyBoostPayment);
router.post('/create-subscription-order', createSubscriptionOrder);
router.post('/verify-subscription-payment', verifySubscriptionPayment);

export default router;