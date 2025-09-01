import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { register, unregister } from '../controllers/pushTokenController';

const router = Router();
router.use(authenticate);

router.post('/register', register);
router.post('/unregister', unregister);

export default router;
