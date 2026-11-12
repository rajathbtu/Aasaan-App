import { Router } from 'express';
import { authenticate } from '../../../middleware/authMiddleware';
import {
  generateAadhaarOtpHandler,
  verifyAadhaarOtpHandler,
} from './controller';

const router = Router();

// Both calls are authenticated: an anonymous user must not be able to spend
// quota verifying Aadhaar numbers.
router.use(authenticate);

// Aadhaar offline e-KYC via Sandbox (https://developer.sandbox.co.in).
// Every call is server-side because the API secret must never reach the app.
router.post('/generate-otp', generateAadhaarOtpHandler);
router.post('/verify-otp', verifyAadhaarOtpHandler);

export default router;