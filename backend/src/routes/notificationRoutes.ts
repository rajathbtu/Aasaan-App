import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { 
  list, 
  markAllRead, 
  registerFCMToken, 
  unregisterFCMToken, 
  sendTestNotification 
} from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

// List notifications
router.get('/', list);
// Mark all as read
router.put('/mark-all-read', markAllRead);
// FCM token management
router.post('/fcm-token', registerFCMToken);
router.delete('/fcm-token', unregisterFCMToken);
// Test notification
router.post('/test', sendTestNotification);

export default router;