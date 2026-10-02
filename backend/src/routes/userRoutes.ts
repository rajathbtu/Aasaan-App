import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getProfile, updateProfile, registerPushToken, removePushToken } from '../controllers/userController';
import { getProfileImageUploadAuthorization, submitProfileImage } from '../controllers/profileImageController';

const router = Router();

router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.get('/me/profile-image-upload-auth', getProfileImageUploadAuthorization);
router.post('/me/profile-image', submitProfileImage);
router.post('/me/push-token', registerPushToken);
router.delete('/me/push-token', removePushToken);

export default router;