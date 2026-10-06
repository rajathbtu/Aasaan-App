import { Request, Response } from 'express';
import {
  SandboxError,
  VerifyOtpData,
  assertValidAadhaarNumber,
  generateAadhaarOtp,
  isMockMode,
  maskAadhaarNumber,
  verifyAadhaarOtp,
} from './client';

/**
 * Sandbox reports *every* verify outcome as HTTP 200, distinguishing success
 * from failure only by the body's `status` and `message`. This collapses that
 * into real status codes so the client can branch on a `code` instead of
 * string-matching, and can tell "wrong OTP" from "try again" from "resend".
 */
type VerifyOutcome =
  | 'valid'
  | 'invalid_otp'
  | 'otp_expired'
  | 'in_process'
  | 'invalid_aadhaar'
  | 'unknown';

/** Classifies a 200-with-message verify body. */
function classifyVerifyResult(data: VerifyOtpData): VerifyOutcome {
  // `status === 'VALID'` is the only reliable success signal.
  if (data?.status === 'VALID') return 'valid';

  const message = (data?.message || '').toLowerCase();
  if (message.includes('invalid otp')) return 'invalid_otp';
  if (message.includes('otp expired')) return 'otp_expired';
  if (message.includes('under process')) return 'in_process';
  if (message.includes('invalid aadhaar')) return 'invalid_aadhaar';
  return 'unknown';
}

/**
 * Sandbox asks the client to wait ~30s when UIDAI is still assembling the
 * record. Retry twice with backoff so a genuinely slow lookup still succeeds
 * without the user re-entering anything.
 */
const RETRY_DELAYS_MS = [2000, 5000];

async function verifyWithRetry(
  referenceId: string,
  otp: string,
): Promise<{ outcome: VerifyOutcome; data: VerifyOtpData; message: string }> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const { data, message } = await verifyAadhaarOtp({ referenceId, otp });
    const outcome = classifyVerifyResult(data);

    if (outcome !== 'in_process' || attempt === RETRY_DELAYS_MS.length) {
      return { outcome, data, message };
    }

    console.log(
      `[SandboxAadhaarOfflineEkyc] UIDAI still processing; retrying in ${RETRY_DELAYS_MS[attempt]}ms`,
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }

  // Unreachable: the loop always returns on its final iteration.
  return { outcome: 'unknown', data: {}, message: '' };
}

/** Maps an outcome onto the status code and code the client switches on. */
function respondToOutcome(res: Response, outcome: VerifyOutcome, message: string): void {
  switch (outcome) {
    case 'invalid_otp':
      res.status(400).json({ message: 'That OTP is not correct.', code: 'invalid_otp' });
      return;
    case 'otp_expired':
      res
        .status(410)
        .json({ message: 'That OTP has expired. Request a new one.', code: 'otp_expired' });
      return;
    case 'in_process':
      res.status(409).json({
        message: 'Verification is still in progress at UIDAI. Please try again in a moment.',
        code: 'verification_in_process',
      });
      return;
    case 'invalid_aadhaar':
      res
        .status(422)
        .json({ message: 'That Aadhaar number could not be verified.', code: 'invalid_aadhaar' });
      return;
    default:
      res.status(502).json({
        message: message || 'UIDAI returned an unexpected response.',
        code: 'unexpected_upstream_response',
      });
  }
}

/**
 * Step 1 — request an OTP on the mobile number registered against the Aadhaar.
 * The raw number is validated and forwarded but never echoed back to the client.
 */
export async function generateAadhaarOtpHandler(req: Request, res: Response): Promise<void> {
  try {
    const aadhaarNumber = assertValidAadhaarNumber(req.body?.aadhaar_number);
    const masked = maskAadhaarNumber(aadhaarNumber);
    const consentGiven = req.body?.consent === true || req.body?.consent === 'Y';

    const result = await generateAadhaarOtp({ aadhaarNumber, consentGiven });

    // Sandbox reports a rejected Aadhaar as HTTP 200 with only a message to go
    // on. Match known failure wording rather than demanding an exact success
    // string: the success wording is not contractual, and pinning it would
    // turn an unfamiliar-but-successful response into a false rejection.
    const rejected = /invalid aadhaar|does not exist|not found|not active|invalid mobile/i.exec(
      result.message || '',
    );
    if (rejected) {
      console.log('[SandboxAadhaarOfflineEkyc] OTP request rejected: invalid Aadhaar');
      res.status(422).json({ message: result.message, code: 'invalid_aadhaar' });
      return;
    }

    console.log('[SandboxAadhaarOfflineEkyc] OTP requested');

    res.json({
      referenceId: result.referenceId,
      maskedAadhaar: masked,
      message: result.message,
      mockMode: isMockMode(),
      // Lets the demo show the OTP that a real UIDAI SMS would otherwise deliver.
      ...(result.debugOtp ? { debugOtp: result.debugOtp } : {}),
    });
  } catch (error) {
    handleSandboxError(res, error, 'Unable to request the Aadhaar OTP.');
  }
}

/**
 * Step 2 — submit the OTP and return the verified e-KYC record.
 *
 * NOTE: the result is intentionally NOT persisted. It is returned to the
 * client, held in component state, and discarded on unmount — no Prisma model
 * and no database writes were added for this feature.
 */
export async function verifyAadhaarOtpHandler(req: Request, res: Response): Promise<void> {
  try {
    const referenceId = String(req.body?.reference_id ?? '').trim();
    if (!referenceId) {
      res.status(400).json({ message: 'A reference id is required.', code: 'reference_id_missing' });
      return;
    }

    const { outcome, data, message } = await verifyWithRetry(referenceId, String(req.body?.otp ?? ''));

    if (outcome !== 'valid') {
      console.log(`[SandboxAadhaarOfflineEkyc] Verification rejected: ${outcome}`);
      respondToOutcome(res, outcome, message);
      return;
    }

    console.log('[SandboxAadhaarOfflineEkyc] Verification succeeded');

    res.json({ status: 'VERIFIED', kyc: buildKycPayload(data) });
  } catch (error) {
    handleSandboxError(res, error, 'Unable to verify the Aadhaar OTP.');
  }
}

/**
 * UIDAI occasionally wraps the base64 payload of `photo` across lines. That
 * whitespace is not valid base64 and makes native decoders fail, so it is
 * stripped server-side. Returns undefined for anything that is not a usable
 * `data:image/...;base64,` URI, so the client can skip rendering it.
 */
function sanitizePhoto(photo: unknown): string | undefined {
  if (typeof photo !== 'string') return undefined;
  const match = /^data:(image\/[a-z+]+);base64,([\s\S]*)$/i.exec(photo.trim());
  if (!match) return undefined;

  const payload = match[2].replace(/\s+/g, '');
  if (payload.length < 32) return undefined;
  return `data:${match[1].toLowerCase()};base64,${payload}`;
}

/** Converts Sandbox's snake_case record into the camelCase shape the app uses. */
function buildKycPayload(data: VerifyOtpData) {
  const address = data.address || {};
  const addressLine =
    [
      address.house,
      address.street,
      address.landmark,
      address.post_office || address.vtc,
      address.district,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(', ') || data.full_address;

  return {
    name: data.name,
    gender: data.gender,
    dateOfBirth: data.date_of_birth,
    yearOfBirth: data.year_of_birth,
    careOf: data.care_of,
    address: addressLine,
    state: address.state,
    pincode: address.pincode,
    photo: sanitizePhoto(data.photo),
  };
}

/** Preserves the upstream `code` so the client can show specific guidance. */
function handleSandboxError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof SandboxError) {
    console.error(`[SandboxAadhaarOfflineEkyc] Provider error: ${error.code}`);
    res.status(error.statusCode).json({ message: error.message, code: error.code });
    return;
  }
  console.error('[SandboxAadhaarOfflineEkyc] Unexpected failure');
  res.status(500).json({ message: fallbackMessage, code: 'aadhaar_kyc_error' });
}