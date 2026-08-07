import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getProfile, updateProfile, getServiceProviderProfile } from '../controllers/userController';

const router = Router();

router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.get('/service-provider/:providerId', getServiceProviderProfile);

export default router;