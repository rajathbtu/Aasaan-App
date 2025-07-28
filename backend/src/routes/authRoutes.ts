import { Router } from 'express';
import { sendOtp, verifyOtp, register } from '../controllers/authController';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);

export default router;