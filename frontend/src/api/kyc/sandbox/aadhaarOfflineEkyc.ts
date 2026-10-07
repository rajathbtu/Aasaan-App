import { api } from '../../index';

/**
 * Aadhaar offline e-KYC via Sandbox (https://developer.sandbox.co.in).
 *
 * Mirrors the allowlisted profile fields the backend builds from Sandbox's
 * snake_case e-KYC record. The portrait and guardian data are not returned.
 */
export interface SandboxAadhaarOfflineEkycResult {
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  yearOfBirth?: string;
  address?: string;
}

export interface SandboxAadhaarOfflineEkycOtpSession {
  referenceId: string;
  /** e.g. 'XXXXXX9012' — the full number is never sent back to the client. */
  maskedAadhaar: string;
  message: string;
  /** True when the backend is simulating UIDAI instead of calling it. */
  mockMode: boolean;
  /** Only present in mock mode: stands in for the SMS the user would receive. */
  debugOtp?: string;
}

export interface SandboxAadhaarOfflineEkycOtpVerification {
  status: 'VERIFIED';
  aadhaarVerified: true;
  kyc: SandboxAadhaarOfflineEkycResult;
}

/** Machine-readable `code` the backend attaches to every failure. */
export type SandboxAadhaarOfflineEkycErrorCode =
  | 'consent_required'
  | 'invalid_aadhaar_format'
  | 'invalid_aadhaar_checksum'
  | 'invalid_aadhaar'
  | 'invalid_otp'
  | 'invalid_otp_format'
  | 'otp_expired'
  | 'verification_in_process'
  | 'reference_id_missing'
  | 'invalid_aadhaar_suffix'
  | 'otp_request_outcome_unknown'
  | 'sandbox_source_unavailable'
  | 'sandbox_unreachable'
  | 'sandbox_not_configured'
  | 'unexpected_upstream_response'
  | 'aadhaar_kyc_error';

/**
 * Step 1 — asks the backend to trigger a UIDAI OTP. The OTP itself is
 * delivered by SMS to the mobile registered against the Aadhaar.
 *
 * Rejects with the backend's `{ message, code }` so callers can branch on
 * `code` rather than matching message text.
 */
export async function generateSandboxAadhaarOfflineEkycOtp(
  token: string,
  aadhaarNumber: string,
  consentGiven: boolean,
): Promise<SandboxAadhaarOfflineEkycOtpSession> {
  const res = await api.post(
    '/aadhaar-kyc/sandbox/aadhaar-offline-ekyc/generate-otp',
    { aadhaar_number: aadhaarNumber, consent: consentGiven },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

/**
 * Step 2 — submits the OTP. On success the verified e-KYC record comes back;
 * on failure the rejection carries a `code` such as `invalid_otp` (400) or
 * `otp_expired` (410), which tells the UI whether to re-prompt or resend.
 */
export async function verifySandboxAadhaarOfflineEkycOtp(
  token: string,
  params: { referenceId: string; otp: string; aadhaarLast4: string },
): Promise<SandboxAadhaarOfflineEkycOtpVerification> {
  const res = await api.post(
    '/aadhaar-kyc/sandbox/aadhaar-offline-ekyc/verify-otp',
    {
      reference_id: params.referenceId,
      otp: params.otp,
      aadhaar_last4: params.aadhaarLast4,
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

/** Reads the backend's `{ message, code }` off an Axios rejection. */
export function readSandboxAadhaarOfflineEkycError(
  err: unknown,
): { message: string; code?: string } {
  const anyErr = err as { response?: { data?: { message?: unknown; code?: unknown } } };
  const data = anyErr?.response?.data;
  return {
    message: typeof data?.message === 'string' ? data.message : 'Something went wrong.',
    code: typeof data?.code === 'string' ? data.code : undefined,
  };
}