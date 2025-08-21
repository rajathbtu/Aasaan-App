import { Request, Response } from 'express';
import { isValidPhoneNumber, isValidName } from '../utils/validation';
import { findUserByPhone, createUser } from '../models/dataStore';
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
    res.status(400).json({ message: 'Invalid phone number' });
    return;
  }
  // const otp = generateOTP();
  const otp = 8891; // TODO: Fixed OTP for testing; revert to generateOTP() for production
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
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, otp } = req.body as { phone: string; otp: number };
  if (!phone || !isValidPhoneNumber(phone)) {
    res.status(400).json({ message: 'Invalid phone number' });
    return;
  }
  const expected = pendingOtps.get(phone);
  if (!expected || expected !== otp) {
    res.status(401).json({ message: 'Incorrect OTP' });
    return;
  }
  const existing = await findUserByPhone(phone);
  if (existing) {
    // Consume OTP only when logging in an existing user
    pendingOtps.delete(phone);
    res.json({ token: existing.id, user: existing });
    return;
  }
  // Keep OTP so that /auth/register can verify presence
  res.json({ needsRegistration: true });
}

/**
 * Register a new user after verifying their phone number.  Requires the
 * phone number and full name.  Optionally accepts the UI language and
 * initial role.  The newly created user is returned along with a token.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { phone, name, language, role } = req.body as {
    phone: string;
    name: string;
    language: string;
    role?: 'endUser' | 'serviceProvider';
  };
  if (!phone || !isValidPhoneNumber(phone) || !pendingOtps.has(phone)) {
    res.status(400).json({ message: 'Phone verification required' });
    return;
  }
  if (!name || !isValidName(name)) {
    res.status(400).json({ message: 'Invalid name' });
    return;
  }
  const existing = await findUserByPhone(phone);
  if (existing) {
    res.status(409).json({ message: 'User already exists' });
    return;
  }
  const user = await createUser({
    name: name.trim(),
    phoneNumber: phone,
    language: language || 'en',
    role: role || 'endUser',
    creditPoints: 0,
    plan: 'free',
  } as any);
  pendingOtps.delete(phone);
  res.json({ token: user.id, user });
}

/**
 * Check if a user is already registered based on their phone number.
 */
export async function checkUserRegistration(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone: string };
  if (!phone || !isValidPhoneNumber(phone)) {
    res.status(400).json({ message: 'Invalid phone number' });
    return;
  }

  try {
    const user = await findUserByPhone(phone);
    res.json({ isRegistered: !!user });
  } catch (error) {
    console.error('Error checking user registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}