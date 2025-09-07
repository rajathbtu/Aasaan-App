import { Request, Response } from 'express';
import { isValidPhoneNumber, isValidName } from '../utils/validation';
import { findUserByPhone, createUser } from '../models/dataStore';
import { generateOTP } from '../models/dataStore';
import { getReqLang, t } from '../utils/i18n';
import { trackUserRegistration, trackUserLogin, trackCustomEvent, trackWithAutoDetection } from '../utils/analytics';

// In‑memory store for OTPs.  Keys are phone numbers, values are the
// generated numeric codes.  In production you should send the OTP via
// SMS and persist it with an expiry timestamp.
const pendingOtps: Map<string, number> = new Map();

/**
 * Send OTP to a mobile number.  Validates the number and generates a
 * random 4‑digit code.  Returns a success message.  The frontend
 * displays a generic message and should not reveal the OTP to the end user.
 */
export function sendOtp(req: Request, res: Response): void {
  const lang = getReqLang(req);
  const { phone } = req.body as { phone: string };
  if (!phone || !isValidPhoneNumber(phone)) {
    res.status(400).json({ message: t(lang, 'auth.invalidPhone') });
    return;
  }
  // const otp = generateOTP();
  const otp = 8891; // TODO: Fixed OTP for testing; revert to generateOTP() for production
  pendingOtps.set(phone, otp);
  
  // Track OTP request
  trackCustomEvent(undefined, 'otp_requested', {
    phone_hash: phone.substring(0, 6) + '****', // Partial phone for privacy
    method: 'phone_otp',
  });
  
  // In a real app you would send the OTP via SMS here
  console.log(`Generated OTP ${otp} for phone ${phone}`);
  res.json({ message: t(lang, 'auth.otpSent') });
}

/**
 * Verify the provided OTP.  If a user exists for the phone number the
 * request succeeds and a token (the user's ID) is returned along with
 * user information.  If the phone is not yet registered the client must
 * call /auth/register to complete registration.  The OTP is removed
 * after a successful verification.
 */
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const lang = getReqLang(req);
  const { phone, otp } = req.body as { phone: string; otp: number };
  if (!phone || !isValidPhoneNumber(phone)) {
    res.status(400).json({ message: t(lang, 'auth.invalidPhone') });
    return;
  }
  const expected = pendingOtps.get(phone);
  if (!expected || expected !== otp) {
    // Track failed OTP verification
    trackCustomEvent(undefined, 'otp_verification_failed', {
      phone_hash: phone.substring(0, 6) + '****',
      reason: 'incorrect_otp',
    });
    
    res.status(401).json({ message: t(lang, 'auth.incorrectOtp') });
    return;
  }
  
  const existing = await findUserByPhone(phone);
  if (existing) {
    // Consume OTP only when logging in an existing user
    pendingOtps.delete(phone);
    
    // Track user login
    trackUserLogin(req, existing.id, 'phone_otp');
    
    res.json({ token: existing.id, user: existing });
    return;
  }
  
  // Track successful OTP verification for new user
  trackCustomEvent(undefined, 'otp_verified_new_user', {
    phone_hash: phone.substring(0, 6) + '****',
  });
  
  // Keep OTP so that /auth/register can verify presence
  res.json({ needsRegistration: true });
}

/**
 * Register a new user after verifying their phone number.  Requires the
 * phone number and full name.  Optionally accepts the UI language and
 * initial role.  The newly created user is returned along with a token.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const lang = getReqLang(req);
  const { phone, name, language, role, otp } = req.body as {
    phone: string;
    name: string;
    language: string;
    role?: 'endUser' | 'serviceProvider';
    otp: number; // Added OTP parameter
  };

  if (!phone || !isValidPhoneNumber(phone)) {
    res.status(400).json({ message: t(lang, 'auth.invalidPhone') });
    return;
  }

  const expectedOtp = pendingOtps.get(phone);
  if (false && otp !== 8891 && (!expectedOtp || expectedOtp !== otp)) { // @todo: Remove harcoded OTP & harcoded false
    res.status(401).json({ message: t(lang, 'auth.incorrectOtp') });
    return;
  }

  if (!name || !isValidName(name)) {
    res.status(400).json({ message: t(lang, 'auth.invalidName') });
    return;
  }

  const existing = await findUserByPhone(phone);
  if (existing) {
    res.status(400).json({ message: t(lang, 'auth.userExists') });
    return;
  }

  try {
    const user = await createUser({
      phoneNumber: phone,
      name,
      language,
      role: role || null, // Allow role to be null
      creditPoints: 0, // Default value
      plan: 'free', // Default value
    });
    pendingOtps.delete(phone); // Consume OTP after successful registration
    
    // Track user registration
    trackUserRegistration(req, {
      id: user.id,
      role: role || undefined,
      language: language,
      plan: 'free',
    }, 'phone_otp');
    
    res.json({ token: user.id, user });
  } catch (error) {
    console.error('Error registering user:', error);
    
    // Track registration failure
    trackCustomEvent(undefined, 'user_registration_failed', {
      phone_hash: phone.substring(0, 6) + '****',
      error_type: 'server_error',
    });
    
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}

/**
 * Check if a user is already registered based on their phone number.
 */
export async function checkUserRegistration(req: Request, res: Response): Promise<void> {
  const lang = getReqLang(req);
  const { phone } = req.body as { phone: string };
  if (!phone || !isValidPhoneNumber(phone)) {
    res.status(400).json({ message: t(lang, 'auth.invalidPhone') });
    return;
  }

  try {
    const user = await findUserByPhone(phone);
    res.json({ isRegistered: !!user });
  } catch (error) {
    console.error('Error checking user registration:', error);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}