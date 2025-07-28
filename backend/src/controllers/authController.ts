import { Request, Response } from 'express';
import { isValidPhoneNumber, isValidName } from '../utils/validation';
import { findUserByPhone, createUser } from '../models/dataStore';
import { encryptPhoneNumber } from '../utils/encryption';
import { generateOTP } from '../models/dataStore';

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
  const { phone } = req.body as { phone: string };
  if (!phone || !isValidPhoneNumber(phone)) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }
  const otp = generateOTP();
  pendingOtps.set(phone, otp);
  // In a real app you would send the OTP via SMS here
  console.log(`Generated OTP ${otp} for phone ${phone}`);
  res.json({ message: 'OTP sent' });
}

/**
 * Verify the provided OTP.  If a user exists for the phone number the
 * request succeeds and a token (the user’s ID) is returned along with
 * user information.  If the phone is not yet registered the client must
 * call /auth/register to complete registration.  The OTP is removed
 * after a successful verification.
 */
export function verifyOtp(req: Request, res: Response): void {
  const { phone, otp } = req.body as { phone: string; otp: number };
  if (!phone || !isValidPhoneNumber(phone)) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }
  const expected = pendingOtps.get(phone);
  if (!expected || expected !== otp) {
    return res.status(401).json({ message: 'Incorrect OTP' });
  }
  pendingOtps.delete(phone);
  const existing = findUserByPhone(phone);
  if (existing) {
    // Login successful.  Return token and user profile.
    return res.json({ token: existing.id, user: existing });
  }
  // Phone verified but user not registered
  return res.json({ needsRegistration: true });
}

/**
 * Register a new user after verifying their phone number.  Requires the
 * phone number and full name.  Optionally accepts the UI language and
 * initial role.  The newly created user is returned along with a token.
 */
export function register(req: Request, res: Response): void {
  const { phone, name, language, role } = req.body as {
    phone: string;
    name: string;
    language: string;
    role?: 'endUser' | 'serviceProvider';
  };
  if (!phone || !isValidPhoneNumber(phone) || !pendingOtps.has(phone)) {
    return res.status(400).json({ message: 'Phone verification required' });
  }
  if (!name || !isValidName(name)) {
    return res.status(400).json({ message: 'Invalid name' });
  }
  const existing = findUserByPhone(phone);
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }
  // In a real app you would encrypt the phone here.  We keep it plain for
  // demonstration and also return the token for the client to use.
  const user = createUser({
    name: name.trim(),
    phoneNumber: phone,
    language: language || 'en',
    role: role || 'endUser',
    creditPoints: 0,
    plan: 'free',
  });
  // Remove OTP after successful registration
  pendingOtps.delete(phone);
  res.json({ token: user.id, user });
}