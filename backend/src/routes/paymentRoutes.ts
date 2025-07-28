import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { boostWorkRequest, subscribePlan } from '../controllers/paymentController';

const router = Router();

router.use(authenticate);

// Boost a work request
router.post('/boost', boostWorkRequest);
// Subscribe to a professional plan
router.post('/subscribe', subscribePlan);

export default router;