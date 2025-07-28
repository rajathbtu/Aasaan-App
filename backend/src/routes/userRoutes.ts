import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getProfile, updateProfile } from '../controllers/userController';

const router = Router();

router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', updateProfile);

export default router;