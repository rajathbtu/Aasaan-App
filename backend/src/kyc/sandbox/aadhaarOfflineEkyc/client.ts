/**
 * Sandbox (sandbox.co.in) API client — Aadhaar offline e-KYC.
 *
 * Wraps the two endpoints behind the Aadhaar OTP flow:
 *
 *   POST /kyc/aadhaar/okyc/otp        -> generateAadhaarOtp()
 *   POST /kyc/aadhaar/okyc/otp/verify -> verifyAadhaarOtp()
 *
 * Both are preceded by `POST /authenticate`, which exchanges the API key and
 * secret for a 24 hour JWT. Sandbox's access token is NOT a bearer token: it
 * goes into the `Authorization` header verbatim, without a `Bearer ` prefix.
 *
 * Three transports, selected by SANDBOX_MODE:
 *
 *   mock  (default) No network at all. Reproduces the upstream envelopes
 *                   byte for byte — including the "HTTP 200 whose body carries
 *                   an error message" behaviour — so the whole flow can be
 *                   exercised without credentials. See MOCK_SCENARIOS.
 *   test            Real HTTPS to test-api.sandbox.co.in with free `key_test`
 *                   credentials. Sandbox keys these off the Aadhaar number, so
 *                   the same table of magic numbers applies.
 *   live            Real HTTPS to api.sandbox.co.in with `key_live`
 *                   credentials. Billed, and needs a real Aadhaar whose
 *                   registered mobile can receive the UIDAI OTP.
 *
 * DEPRECATION: UIDAI has deprecated the Aadhaar offline e-KYC endpoint and
 * Sandbox recommends the DigiLocker flow instead. Both endpoints still
 * respond, but this should not be the only identity check in production.
 */

import { randomUUID } from 'crypto';

export type SandboxMode = 'mock' | 'test' | 'live';

const TEST_BASE_URL = 'https://test-api.sandbox.co.in';
const LIVE_BASE_URL = 'https://api.sandbox.co.in';

const GENERATE_OTP_PATH = '/kyc/aadhaar/okyc/otp';
const VERIFY_OTP_PATH = '/kyc/aadhaar/okyc/otp/verify';
const AUTHENTICATE_PATH = '/authenticate';

/** The two `@entity` discriminators Sandbox requires on the body. */
const GENERATE_ENTITY = 'in.co.sandbox.kyc.aadhaar.okyc.otp.request';
const VERIFY_ENTITY = 'in.co.sandbox.kyc.aadhaar.okyc.request';

/** Access tokens last 24h; refresh well before that to avoid edge expiry. */
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 15000;

/** Reason sent to UIDAI for every verification — required for their audit trail. */
export const DEFAULT_AADHAAR_REASON =
  process.env.SANDBOX_AADHAAR_REASON?.trim() ||
  'Identity verification for Aasaan account';

/**
 * Carries an upstream `code` so callers can branch on a machine-readable value
 * instead of pattern-matching on the human-readable message.
 */
export class SandboxError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code = 'sandbox_error') {
    super(message);
    this.name = 'SandboxError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Envelope and payload types (all snake_case: these mirror Sandbox verbatim)
// ---------------------------------------------------------------------------

export interface SandboxEnvelope<T> {
  code: number;
  timestamp: number;
  transaction_id: string;
  data: T;
}

/** What `POST /kyc/aadhaar/okyc/otp` puts in `data`. */
export interface GenerateOtpData {
  '@entity': string;
  reference_id: number;
  message: string;
}

/** The split address Sandbox returns alongside `full_address`. */
export interface EkycAddress {
  '@entity'?: string;
  country?: string;
  district?: string;
  house?: string;
  landmark?: string;
  pincode?: string;
  post_office?: string;
  state?: string;
  street?: string;
  subdistrict?: string;
  vtc?: string;
}

/**
 * What `POST /kyc/aadhaar/okyc/otp/verify` puts in `data` on success.
 *
 * `status` is the only reliable success signal — Sandbox answers HTTP 200 even
 * for "Invalid OTP", so every other outcome arrives as a `message` with no
 * `status` at all.
 */
export interface VerifyOtpData {
  /** Echoed back by Sandbox; informational only. */
  '@entity'?: string;
  reference_id?: number;
  status?: 'VALID';
  message?: string;
  name?: string;
  gender?: string;
  year_of_birth?: string;
  date_of_birth?: string;
  care_of?: string;
  full_address?: string;
  address?: EkycAddress;
  mobile_hash?: string;
  email_hash?: string;
  share_code?: string;
  /** Base64 data URL. Never persisted and never logged. */
  photo?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface SandboxConfig {
  mode: SandboxMode;
  apiKey?: string;
  apiSecret?: string;
  apiVersion: string;
  baseUrl: string;
}

function readSandboxConfig(): SandboxConfig {
  const rawMode = (process.env.SANDBOX_MODE?.trim() || 'mock').toLowerCase();
  if (rawMode !== 'mock' && rawMode !== 'test' && rawMode !== 'live') {
    throw new SandboxError(
      `SANDBOX_MODE must be "mock", "test" or "live", received "${rawMode}".`,
      500,
      'sandbox_invalid_mode',
    );
  }

  const mode = rawMode as SandboxMode;
  const apiVersion = process.env.SANDBOX_API_VERSION?.trim() || '1.0.0';
  const baseUrl = process.env.SANDBOX_BASE_URL?.trim() ||
    (mode === 'live' ? LIVE_BASE_URL : TEST_BASE_URL);

  // Mock mode is deliberately credential-free so the flow is demoable by
  // anyone who clones the repo. The other modes refuse to run unconfigured.
  if (mode === 'mock') {
    return { mode, apiVersion, baseUrl };
  }

  const apiKey = process.env.SANDBOX_API_KEY?.trim();
  const apiSecret = process.env.SANDBOX_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new SandboxError(
      'Sandbox is not configured. Set SANDBOX_API_KEY and SANDBOX_API_SECRET, or set SANDBOX_MODE=mock.',
      500,
      'sandbox_not_configured',
    );
  }

  return { mode, apiKey, apiSecret, apiVersion, baseUrl };
}

/** True when responses are simulated locally, so the UI may surface the OTP. */
export function isMockMode(): boolean {
  return readSandboxConfig().mode === 'mock';
}

// ---------------------------------------------------------------------------
// Verhoeff checksum
//
// Rejects mistyped Aadhaar numbers before they reach UIDAI. Only enforced in
// live mode: Sandbox's magic test numbers (123456789012 and friends) are not
// checksum-valid and would be rejected outright.
// ---------------------------------------------------------------------------

const VERHOEFF_D = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const VERHOEFF_P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];

/**
 * Runs the Verhoeff algorithm over `digits`. Returns 0 for a valid number; the
 * check digit to append is `(10 - result) % 10`.
 *
 * Digits are consumed right to left, since the check digit sits last. `d` is
 * the 10x10 substitution table indexed by the running checksum, and `p` the
 * 8x10 permutation table applied to each digit first.
 */
function verhoeffChecksum(digits: string[]): number {
  let c = 0;
  const reversed = [...digits].reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(reversed[i])]];
  }
  return c;
}

/**
 * Appends the Verhoeff check digit to an 11 digit base, producing a valid 12
 * digit number.
 *
 * The check digit is derived by search rather than by a closed-form shortcut:
 * Verhoeff is not modular in the way Luhn is, so `(10 - c) % 10` — which is
 * valid for Luhn — produces numbers that fail validation. Ten candidates is
 * trivial to test, and exactly one of them satisfies the invariant.
 */
export function withAadhaarCheckDigit(base11: string): string {
  for (let digit = 0; digit <= 9; digit++) {
    const candidate = `${base11}${digit}`;
    if (verhoeffChecksum([...candidate]) === 0) return candidate;
  }
  throw new SandboxError(
    'Could not derive a valid Aadhaar check digit.',
    400,
    'invalid_aadhaar_checksum',
  );
}

function hasValidAadhaarChecksum(aadhaarNumber: string): boolean {
  return verhoeffChecksum([...aadhaarNumber]) === 0;
}

/**
 * Normalises to 12 bare digits and enforces the checksum in live mode.
 * Returns the cleaned number, or throws with a user-presentable message.
 */
export function assertValidAadhaarNumber(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D+/g, '');
  if (digits.length !== 12) {
    throw new SandboxError(
      'Aadhaar number must be exactly 12 digits.',
      400,
      'invalid_aadhaar_format',
    );
  }
  if (readSandboxConfig().mode === 'live' && !hasValidAadhaarChecksum(digits)) {
    throw new SandboxError(
      'That Aadhaar number failed its checksum. Please re-check the digits.',
      400,
      'invalid_aadhaar_checksum',
    );
  }
  return digits;
}

/** Keeps the last four digits visible and masks the rest, for logs and UI. */
export function maskAadhaarNumber(aadhaarNumber: string): string {
  return `XXXXXX${aadhaarNumber.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;
/** De-duplicates concurrent /authenticate calls behind a single in-flight promise. */
let tokenRequest: Promise<string> | null = null;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Parses a Sandbox error envelope, tolerating non-JSON bodies from proxies. */
async function readEnvelope(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Exchanges the API key and secret for a 24 hour access token.
 * The token is cached process-wide until shortly before it expires.
 */
async function getAccessToken(config: SandboxConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const response = await fetchWithTimeout(`${config.baseUrl}${AUTHENTICATE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey as string,
        'x-api-secret': config.apiSecret as string,
        'x-api-version': config.apiVersion,
      },
    }).catch((error) => {
      throw new SandboxError(
        `Could not reach Sandbox to authenticate: ${(error as Error).message}`,
        502,
        'sandbox_unreachable',
      );
    });

    const body = await readEnvelope(response);
    const token = body?.data?.access_token;
    if (!response.ok || !token) {
      throw new SandboxError(
        body?.message || `Sandbox authentication failed with status ${response.status}.`,
        response.status || 502,
        'sandbox_auth_failed',
      );
    }

    cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return token;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

/** Drops the cached token so the next request re-authenticates. */
function invalidateAccessToken(): void {
  cachedToken = null;
}

/**
 * Performs an authenticated Sandbox call.
 *
 * Sandbox answers 401 for an expired token, so one transparent retry is made
 * after invalidating the cache — this is what makes a 24 hour token safe to
 * hold without any background refresh job.
 */
async function sandboxRequest<T>(
  path: string,
  body: Record<string, unknown>,
  allowRetry = true,
): Promise<SandboxEnvelope<T>> {
  const config = readSandboxConfig();
  const token = await getAccessToken(config);

  const response = await fetchWithTimeout(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Deliberately not `Bearer ${token}` — Sandbox rejects the prefix.
      Authorization: token,
      'x-api-key': config.apiKey as string,
      'x-api-version': config.apiVersion,
    },
    body: JSON.stringify(body),
  }).catch((error) => {
    throw new SandboxError(
      `Could not reach Sandbox: ${(error as Error).message}`,
      502,
      'sandbox_unreachable',
    );
  });

  if (response.status === 401 && allowRetry) {
    invalidateAccessToken();
    return sandboxRequest<T>(path, body, false);
  }

  const parsed = await readEnvelope(response);
  if (!response.ok) {
    const referenceId = Number(parsed?.data?.reference_id);
    const hasRecoverableOtpSession =
      path === GENERATE_OTP_PATH &&
      response.status === 503 &&
      Number.isSafeInteger(referenceId) &&
      referenceId > 0 &&
      typeof parsed?.data?.message === 'string';

    if (hasRecoverableOtpSession) {
      return parsed as SandboxEnvelope<T>;
    }

    const otpOutcomeUnknown = path === GENERATE_OTP_PATH && response.status === 503;
    throw new SandboxError(
      otpOutcomeUnknown
        ? 'Sandbox did not confirm the OTP request. An OTP may still have been sent, but no verification reference was returned. Wait for that code to expire before requesting another.'
        : parsed?.message || `Sandbox request failed with status ${response.status}.`,
      response.status,
      otpOutcomeUnknown
        ? 'otp_request_outcome_unknown'
        : parsed?.code
          ? `sandbox_${response.status}`
          : 'sandbox_error',
    );
  }

  return parsed as SandboxEnvelope<T>;
}

// ---------------------------------------------------------------------------
// Mock transport
//
// Sandbox's test host keys its responses off the Aadhaar number itself, and
// publishes a table of magic numbers — one per branch of the flow. Mock mode
// reproduces that table so every branch can be exercised with no credentials,
// no network, and no billing.
// ---------------------------------------------------------------------------

/**
 * Stand-in portrait for mock mode: a flat avatar silhouette, generated so the
 * demo shows the same code path as a real UIDAI photo (a base64 data URL in
 * `photo`) without needing a real Aadhaar. Real responses carry a JPEG.
 */
const MOCK_PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAIAAAAErfB6AAACh0lEQVR4nO3dwW0bQRQEUeV/dUyOwhk4BxtKwYJM1u/aAiqAYT8sjzMfv37/LXEf+AnqpQUsL2B5AcsLWF7A8gKWF7C8gOUFLC9geQHLC1hewPIClhewvIDlBSwvYHkBywtYXsDyApYXsLyA5QUsL2B5AcszA//4+effw0/7ooTAX3LVS3uAv+lqlZYA/3ddjfE88ItoNczbwG/QXTdeBX4b7TrzJDCiO2q8BwzqLhqPAeO6c8ZLwLjronHAAd8IFx013gDGLXeNAw6YDlecNr4OjPutGwcccMABP1n3uHHAAQcc8MN1LxsHHHDAAQcccMABBxzw5fDFAg74UjhYwAEHHDBdwAEHHHDAAQcc8LIxvlXAAd8LZws449O6AQdMh+MF/HRjfJ954MvG+DIBB0yfYNcY30QFfM0YXyPggNeA7xjjO2iBLxjjC8iBu6vSD9xts37gNzPjv/SJwH2+TmDkz3lXegkYp11k3gDGOXeZrwPjhOvMd4FxNgfzUWBcS2N8DhhHkjHfAsZtfMZXgHESK/MJYFxCbMwD4wZuYxgYX19vTALjuz/BGAPGF3+IMQOMb/0cYwAYX/lRxgEHnO6y8VuB8WXvJATGN71WwPJUwPiaNwtYngQY3/FyAcubB8YXvF/A8oaB8e1WClhewPImgfHVtgpYXsDyApY3BozvtVjA8gKWF7C8gOUFLC9geQHLC1hewPIClhewvIDlBSwvYHkBywtY3hJwxhd0Az5UwPIClrcHnDGuG/CVApa3CpwxqxvwibaBMwZ1A+YzAGdM6QYccMbLugEHnPGybje+y3V7s0GuG3DAGS/r9vKZXLe3C+W6vT4q1+WBn2DMzssDu43xbT8BJdc+d/AxIWcAAAAASUVORK5CYII=';

type MockVerifyOutcome =
  | 'valid'
  | 'invalid_otp'
  | 'otp_expired'
  | 'in_process'
  | 'invalid_reference';

interface MockScenario {
  referenceId: number;
  otp: string;
  verify: MockVerifyOutcome;
}

/**
 * The magic numbers, matching Sandbox's published examples. Any other
 * checksum-valid-looking 12 digit number falls through to the happy path.
 */
const MOCK_SCENARIOS: Record<string, MockScenario> = {
  // Happy path: 123456789012 -> reference 1234567 -> OTP 121212 -> full KYC.
  '123456789012': { referenceId: 1234567, otp: '121212', verify: 'valid' },
  '123456789015': { referenceId: 1234568, otp: '121211', verify: 'invalid_otp' },
  '123456789016': { referenceId: 1234569, otp: '121711', verify: 'otp_expired' },
  '123456789018': { referenceId: 1234570, otp: '121811', verify: 'in_process' },
};

/** Aadhaar numbers that fail at the generate step rather than the verify step. */
const MOCK_INVALID_AADHAAR = new Set(['123456789013']); // -> "Invalid Aadhaar Card"
const MOCK_UNAVAILABLE_AADHAAR = new Set(['123456789020']); // -> HTTP 503

/** referenceId -> scenario, so verify can find what generate issued. */
const mockSessions = new Map<string, MockScenario>();

function mockEnvelope<T>(data: T, status = 200): SandboxEnvelope<T> {
  return {
    code: status,
    timestamp: 1000000000000,
    transaction_id: randomUUID(),
    data,
  };
}

function mockGenerateOtp(aadhaarNumber: string): SandboxEnvelope<GenerateOtpData> {
  if (MOCK_UNAVAILABLE_AADHAAR.has(aadhaarNumber)) {
    throw new SandboxError('Source Unavailable', 503, 'sandbox_source_unavailable');
  }

  const known = MOCK_SCENARIOS[aadhaarNumber];
  if (MOCK_INVALID_AADHAAR.has(aadhaarNumber)) {
    // Sandbox returns HTTP 200 with this message, not an error status.
    return mockEnvelope<GenerateOtpData>({
      '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.response',
      reference_id: 78829,
      message: 'Invalid Aadhaar Card',
    });
  }

  const scenario: MockScenario = known ?? {
    referenceId: Number(aadhaarNumber.slice(-5)) + 1000000,
    otp: '121212',
    verify: 'valid',
  };
  mockSessions.set(String(scenario.referenceId), scenario);

  return mockEnvelope<GenerateOtpData>({
    '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.response',
    reference_id: scenario.referenceId,
    message: 'OTP sent successfully',
  });
}

function mockVerifyOtp(referenceId: string, otp: string): SandboxEnvelope<VerifyOtpData> {
  const scenario = mockSessions.get(referenceId);
  const entity = 'in.co.sandbox.kyc.aadhaar.okyc';

  // Unknown reference, or an OTP that simply does not match.
  if (!scenario || otp !== scenario.otp || scenario.verify === 'invalid_otp') {
    return mockEnvelope<VerifyOtpData>({ '@entity': entity, message: 'Invalid OTP' });
  }

  if (scenario.verify === 'in_process') {
    return mockEnvelope<VerifyOtpData>({
      '@entity': entity,
      message: 'Request under process, please try after 30 seconds',
    });
  }

  if (scenario.verify === 'otp_expired') {
    return mockEnvelope<VerifyOtpData>({ '@entity': entity, message: 'OTP Expired' });
  }

  // Sessions are single-use, matching UIDAI: a second verify fails.
  mockSessions.delete(referenceId);

  return mockEnvelope<VerifyOtpData>({
    '@entity': entity,
    reference_id: Number(referenceId),
    status: 'VALID',
    message: 'Aadhaar Card Exists',
    care_of: 'S/O: Johnny Doe',
    full_address:
      'Mangal Kanaka Niwas, Main Cross 3rd, Bengaluru, Bengaluru-Karnataka, India ',
    date_of_birth: '21-04-1985',
    email_hash: '044917e2c4c62a439d068.......d9f71bbde10b1d227a914e',
    gender: 'M',
    name: 'John Doe',
    address: {
      '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.address',
      country: 'India',
      district: 'Bengaluru',
      house: 'Mangal Kanaka Niwas',
      landmark: '',
      pincode: '581615',
      post_office: 'Bengaluru',
      state: 'Karnataka',
      street: 'Main Cross 3rd',
      subdistrict: '',
      vtc: 'Bengaluru',
    },
    year_of_birth: '1985',
    mobile_hash: '044917e2c4c62a439d068.......d9f71bbde10b1d227a914e',
    photo: MOCK_PHOTO,
    share_code: '1234',
  });
}

/** Pauses so loading spinners are actually visible while demoing. */
function mockLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 600));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateAadhaarOtpResult {
  referenceId: string;
  message: string;
  /** Only set in mock mode, so the demo OTP can be shown on screen. */
  debugOtp?: string;
}

/**
 * Asks UIDAI to send an OTP to the mobile number registered against the
 * Aadhaar. Consent must already have been captured from the user — UIDAI
 * rejects the request otherwise.
 */
export async function generateAadhaarOtp(params: {
  aadhaarNumber: string;
  consentGiven: boolean;
  reason?: string;
}): Promise<GenerateAadhaarOtpResult> {
  const { aadhaarNumber, consentGiven } = params;
  const reason = params.reason?.trim() || DEFAULT_AADHAAR_REASON;

  // Never let an unconsented request reach UIDAI — it would burn a billed call.
  if (!consentGiven) {
    throw new SandboxError(
      'Explicit consent is required before an Aadhaar OTP can be requested.',
      400,
      'consent_required',
    );
  }

  const config = readSandboxConfig();
  const request = {
    '@entity': GENERATE_ENTITY,
    aadhaar_number: aadhaarNumber,
    consent: 'Y',
    reason,
  };

  if (config.mode === 'mock') {
    await mockLatency();
    const envelope = mockGenerateOtp(aadhaarNumber);
    const scenario = mockSessions.get(String(envelope.data.reference_id));
    return {
      referenceId: String(envelope.data.reference_id),
      message: envelope.data.message,
      // Surfaced only in mock mode; a real UIDAI OTP is never readable by us.
      ...(scenario ? { debugOtp: scenario.otp } : {}),
    };
  }

  const envelope = await sandboxRequest<GenerateOtpData>(GENERATE_OTP_PATH, request);
  return {
    referenceId: String(envelope.data.reference_id),
    message: envelope.data.message,
  };
}

/**
 * Submits the OTP the user typed. The result carries the raw upstream `data`
 * plus the envelope message: callers must check `status === 'VALID'`, because
 * Sandbox reports every failure as an HTTP 200 with only a `message`.
 */
export async function verifyAadhaarOtp(params: {
  referenceId: string;
  otp: string;
}): Promise<{ message: string; data: VerifyOtpData }> {
  const { referenceId, otp } = params;

  const digits = otp.replace(/\D+/g, '');
  if (digits.length !== 6) {
    throw new SandboxError('The OTP must be exactly 6 digits.', 400, 'invalid_otp_format');
  }

  const config = readSandboxConfig();
  const request = {
    '@entity': VERIFY_ENTITY,
    reference_id: String(referenceId),
    otp: digits,
  };

  if (config.mode === 'mock') {
    await mockLatency();
    const envelope = mockVerifyOtp(String(referenceId), digits);
    return { message: envelope.data.message ?? '', data: envelope.data };
  }

  const envelope = await sandboxRequest<VerifyOtpData>(VERIFY_OTP_PATH, request);
  return { message: envelope.data?.message ?? '', data: envelope.data };
}