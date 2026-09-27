import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getProfile, updateProfile, registerPushToken, removePushToken } from '../controllers/userController';

const router = Router();

router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.post('/me/push-token', registerPushToken);
router.delete('/me/push-token', removePushToken);

export default router;