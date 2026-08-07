import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { list, markAllRead, sendTest } from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

// List notifications
router.get('/', list);
// Mark all as read
router.put('/mark-all-read', markAllRead);
// Send test push
router.post('/test', sendTest);

export default router;