import { Router } from 'express';
import { approveProfileImage, blockProfileImage, listProfileImagesForReview } from '../controllers/profileImageModerationController';
import { authenticate } from '../middleware/authMiddleware';
import { requireModerator } from '../middleware/moderator';

const router = Router();

router.use(authenticate, requireModerator);
router.get('/', listProfileImagesForReview);
router.post('/:userId/approve', approveProfileImage);
router.post('/:userId/block', blockProfileImage);

export default router;