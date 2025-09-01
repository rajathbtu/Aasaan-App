import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { registerDevice, unregisterDevice } from '../controllers/deviceController';

const router = Router();
router.use(authenticate);
router.post('/register', registerDevice);
router.post('/unregister', unregisterDevice);

export default router;
