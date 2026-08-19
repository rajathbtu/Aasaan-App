import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { isValidPhoneNumber, isValidName } from '../utils/validation';
import { findUserByPhone, createUser } from '../models/dataStore';
import { getReqLang, t } from '../utils/i18n';

// In‑memory store for OTPs.  Keys are phone numbers, values are the
// generated numeric codes.  In production you should send the OTP via
// SMS and persist it with an expiry timestamp.
const pendingOtps: Map<string, number> = new Map();

type TruecallerLoginState =
  | { status: 'pending' | 'processing'; expiresAt: number }
  | { status: 'complete'; token: string; user: unknown; expiresAt: number }
  | { status: 'failed'; message: string; expiresAt: number };

const truecallerLogins = new Map<string, TruecallerLoginState>();
const TRUECALLER_PROFILE_TTL_MS = 10 * 60 * 1000;
const TRUECALLER_PROFILE_HOSTS = new Set([
  'profile4-noneu.truecaller.com',
  'profile4-eu.truecaller.com',
]);

function getExpiry(): number {
  return Date.now() + TRUECALLER_PROFILE_TTL_MS;
}

function isAllowedTruecallerEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && TRUECALLER_PROFILE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function normalizeTruecallerPhone(phone: string | number): string {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function completeTruecallerLogin(
  requestId: string,
  accessToken: string,
  endpoint: string
): Promise<void> {
  const currentState = truecallerLogins.get(requestId);
  if (!currentState || currentState.status === 'complete' || currentState.status === 'failed') return;
  truecallerLogins.set(requestId, { status: 'processing', expiresAt: currentState.expiresAt });

  try {
    const profileResponse = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Cache-Control': 'no-cache',
      },
    });
    if (!profileResponse.ok) {
      throw new Error(`Truecaller profile request failed with ${profileResponse.status}`);
    }

    const profile = await profileResponse.json() as {
      phoneNumbers?: Array<string | number>;
      name?: { first?: string; last?: string };
    };
    const phone = normalizeTruecallerPhone(profile.phoneNumbers?.[0] || '');
    if (!isValidPhoneNumber(phone)) {
      throw new Error('Truecaller did not return a valid phone number');
    }

    const firstName = profile.name?.first?.trim() || '';
    const lastName = profile.name?.last?.trim() || '';
    const name = `${firstName} ${lastName}`.trim() || 'Truecaller User';
    const existing = await findUserByPhone(phone);
    const user = existing || await createUser({
      phoneNumber: phone,
      name,
      language: 'en', // @todo selected language by user is not being set.. may be we can save it upon role selection in the next screen
      role: null,
      creditPoints: 0,
      plan: 'free',
    });

    const latestState = truecallerLogins.get(requestId);
    if (latestState?.status === 'processing') {
      truecallerLogins.set(requestId, {
        status: 'complete',
        token: user.id,
        user,
        expiresAt: latestState.expiresAt,
      });
    }
  } catch (error) {
    console.error('Truecaller login failed:', error);
    const latestState = truecallerLogins.get(requestId);
    if (latestState?.status === 'processing') truecallerLogins.set(requestId, {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unable to complete Truecaller login',
      expiresAt: latestState.expiresAt,
    });
  }
}

/** Creates a server-owned request ID before the Truecaller flow begins. */
export function startTruecallerLogin(_req: Request, res: Response): void {
  const requestId = randomUUID().replace(/-/g, '').slice(0, 32);
  truecallerLogins.set(requestId, { status: 'pending', expiresAt: getExpiry() });
  res.json({ requestId });
}

/** Receives the short-lived Truecaller access token and starts profile lookup. */
export function truecallerCallback(req: Request, res: Response): void {
  const { requestId: callbackRequestId, requestNonce, accessToken, endpoint, status } = req.body as {
    requestId?: string;
    requestNonce?: string;
    accessToken?: string;
    endpoint?: string;
    status?: string;
  };

  const requestId = callbackRequestId || requestNonce;
  if (!requestId) {
    res.status(400).json({ message: 'Missing Truecaller requestId' });
    return;
  }

  const currentState = truecallerLogins.get(requestId);
  if (!currentState || currentState.expiresAt <= Date.now()) {
    truecallerLogins.delete(requestId);
    res.status(400).json({ message: 'Unknown or expired Truecaller requestId' });
    return;
  }

  if (status === 'user_rejected') {
    if (currentState.status === 'pending') {
      truecallerLogins.set(requestId, {
        status: 'failed',
        message: 'Truecaller login was cancelled',
        expiresAt: currentState.expiresAt,
      });
    }
    res.sendStatus(204);
    return;
  }

  if (status === 'flow_invoked') {
    res.sendStatus(204);
    return;
  }

  if (!accessToken || !endpoint || !isAllowedTruecallerEndpoint(endpoint)) {
    if (currentState.status === 'pending') {
      truecallerLogins.set(requestId, {
        status: 'failed',
        message: 'Invalid Truecaller callback',
        expiresAt: currentState.expiresAt,
      });
    }
    res.status(400).json({ message: 'Invalid Truecaller callback' });
    return;
  }

  if (currentState.status !== 'pending') {
    res.sendStatus(204);
    return;
  }
  setImmediate(() => void completeTruecallerLogin(requestId, accessToken, endpoint));
  res.sendStatus(204);
}

/** Returns the status for the requestId created by the mobile Web SDK. */
export function truecallerStatus(req: Request, res: Response): void {
  const state = truecallerLogins.get(req.params.requestId);
  if (!state) {
    res.status(404).json({ message: 'Truecaller login request not found' });
    return;
  }
  if (state.expiresAt <= Date.now()) {
    truecallerLogins.delete(req.params.requestId);
    res.status(404).json({ message: 'Truecaller login request expired' });
    return;
  }
  res.json(state);
  if (state.status === 'complete' || state.status === 'failed') {
    truecallerLogins.delete(req.params.requestId);
  }
}

setInterval(() => {
  // Request IDs are single-use and should not remain in process memory forever.
  for (const [requestId, state] of truecallerLogins) {
    if (state.expiresAt <= Date.now()) {
      truecallerLogins.delete(requestId);
    }
  }
}, TRUECALLER_PROFILE_TTL_MS).unref();

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
  // In a real app you would send the OTP via SMS here
  console.log(`Generated OTP ${otp} for phone ${phone}`);
  res.json({ message: t(lang, 'auth.otpSent') });
}

/**
 * Verify the provided OTP.  If a user exists for the phone number the
 * request succeeds and a token (the user’s ID) is returned along with
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
    res.status(401).json({ message: t(lang, 'auth.incorrectOtp') });
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
  if (false && (!expectedOtp || expectedOtp !== otp)) { // @todo: Remove harcoded OTP & harcoded false
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
    res.json({ token: user.id, user });
  } catch (error) {
    console.error('Error registering user:', error);
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