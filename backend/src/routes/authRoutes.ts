import { Router } from 'express';
import {
	sendOtp,
	verifyOtp,
	register,
	checkUserRegistration,
	truecallerCallback,
	truecallerStatus,
	startTruecallerLogin,
	completeOnboarding,
} from '../controllers/authController';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/complete-onboarding', completeOnboarding);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/check-registration', checkUserRegistration);
router.post('/truecaller/callback', truecallerCallback);
router.post('/truecaller/start', startTruecallerLogin);
router.get('/truecaller/status/:requestId', truecallerStatus);

export default router;