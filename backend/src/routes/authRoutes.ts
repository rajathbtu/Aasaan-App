import { Router } from 'express';
import { sendOtp, verifyOtp, register, checkUserRegistration } from '../controllers/authController';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/check-registration', checkUserRegistration);

export default router;