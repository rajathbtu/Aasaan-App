# Sandbox Aadhaar Offline e-KYC (OTP)

Verifies a user's Aadhaar by sending an OTP to the mobile number registered with
UIDAI, then returning this method's verified e-KYC fields (name, DOB, gender,
address, and portrait).

> ⚠️ **UIDAI has deprecated the Aadhaar offline e-KYC endpoint.** Sandbox's own
> docs recommend the DigiLocker-based flow instead. Both endpoints still respond
> today, but this should not become the only identity check in production.

For conventions on adding another provider or another approach from Sandbox,
see [`src/kyc/README.md`](src/kyc/README.md).

## Files

| File | Role |
| --- | --- |
| `src/kyc/sandbox/aadhaarOfflineEkyc/client.ts` | Sandbox auth, transport, mock scenarios, and Aadhaar validation |
| `src/kyc/sandbox/aadhaarOfflineEkyc/controller.ts` | Sandbox response handling and this method's response mapping |
| `src/kyc/sandbox/aadhaarOfflineEkyc/routes.ts` | Authenticated OTP endpoints for this method |
| `../frontend/src/api/kyc/sandbox/aadhaarOfflineEkyc.ts` | This method's API client and response types |
| `../frontend/src/screens/kyc/sandbox/AadhaarOfflineEkycScreen.tsx` | This method's two-step OTP UI |

This directory identifies both the provider (`sandbox`) and approach
(`aadhaarOfflineEkyc`). Other providers or other Sandbox verification methods
can have separate routes, screens, and response types without sharing this
flow's OTP assumptions or result shape.

The backend endpoint base is `/aadhaar-kyc/sandbox/aadhaar-offline-ekyc`:

- `POST /generate-otp`
- `POST /verify-otp`

## Modes

`SANDBOX_MODE` in `backend/.env` picks the transport.

### `mock` (default, committed)

No network, no credentials, no billing. Simulates UIDAI locally and returns the
OTP to the app so it can be shown on screen. This is what you run to experience
the flow.

### `test`

Real HTTPS to `test-api.sandbox.co.in` with **free** `key_test` credentials:

1. Sign up at <https://accounts.sandbox.co.in>
2. **Settings → API Keys**, copy the *test* key and secret
3. Fill in `SANDBOX_API_KEY` / `SANDBOX_API_SECRET`, set `SANDBOX_MODE=test`

### `live`

Real HTTPS to `api.sandbox.co.in` with `key_live` credentials. **Calls are
billed** and require a real Aadhaar whose registered mobile can receive the OTP.
In live mode the Verhoeff checksum is enforced, so the number must be valid — use
`withAadhaarCheckDigit()` from
`src/kyc/sandbox/aadhaarOfflineEkyc/client.ts` to generate one.

## Testing with a real OTP and real Aadhaar details

This is the only mode that sends a genuine SMS and returns genuine UIDAI data.
It takes three things.

### 1. Production credentials

1. Sign in at <https://console.sandbox.co.in>
2. Buy a plan, or start the **14-day free trial** — either gives you production
   access. Test calls are free, production calls consume quota/wallet balance.
3. **Settings → API Keys** → copy the **production** key and secret. They are
   prefixed `key_live` / `secret_live`. The secret is shown only once.
4. Set in `backend/.env`:

   ```env
   SANDBOX_MODE=live
   SANDBOX_API_KEY=key_live...
   SANDBOX_API_SECRET=secret_live...
   ```

   Restart the backend — config is read per request, but a restart is cleaner.

### 2. An Aadhaar you can actually receive the OTP for

This is the part that trips people up. UIDAI only sends the OTP to the **mobile
number registered against that specific Aadhaar**. So you need:

- an Aadhaar you control, and
- access to the mobile registered with it, since the code arrives there and
  nowhere else.

It does **not** have to be the phone number signed into the app. The app only
asks for the 12-digit Aadhaar; the SMS goes to whatever number UIDAI holds.

Because this is live mode, the number must pass the Verhoeff checksum. If you
are typing a real Aadhaar off a card it will; if you made one up to avoid
sharing it, generate a valid one:

```ts
import { withAadhaarCheckDigit } from './src/kyc/sandbox/aadhaarOfflineEkyc/client';
withAadhaarCheckDigit('99999999001'); // -> '999999990019'
```

That fake number will pass local validation but will never yield a real OTP,
since it does not exist at UIDAI — useful for confirming the request is shaped
correctly before spending a call on a real number.

### 3. Run the flow

Open **Profile → Verify Aadhaar with OTP**, enter the number, accept consent,
tap **Send OTP**, then type the 6 digits from the SMS.

What changes versus mock mode:

- No OTP banner appears on screen — `debugOtp` is only ever set by the mock
  transport. The SMS is the only source of the code.
- `reference_id` is real and single-use, and the OTP expires (UIDAI's window is
  short, so enter it promptly).
- Each call is billed. A wrong OTP still costs you.
- The result card shows the genuine name, DOB, gender, guardian and address.

### If something is off

| Symptom | Likely cause |
| --- | --- |
| `403` on the first call | No active subscription/trial, or production keys not enabled yet |
| `401` | Wrong key/secret pair, or `SANDBOX_MODE` mismatched to the key prefix |
| OTP never arrives | No mobile linked to that Aadhaar, or the linked one is inactive |
| `Source Unavailable` (503) | UIDAI upstream. Retry shortly |
| `Invalid Aadhaar Card` | Number isn't valid at UIDAI (or is a seeded/test Aadhaar) |
| Checksum error before any call | Not a real Aadhaar — expected in live mode only |

Use the `transaction_id` from any Sandbox error response when contacting
Sandbox support.

## Demo numbers

Sandbox keys its test responses off the Aadhaar number itself. Mock mode
reproduces this table exactly, so every branch of the flow is reachable:

| Aadhaar | Outcome |
| --- | --- |
| `123456789012` | OTP `121212` → **full verified KYC record** |
| `123456789013` | `Invalid Aadhaar Card` (422) |
| `123456789015` | OTP sent, but any OTP → `Invalid OTP` (400) |
| `123456789016` | OTP `121711` → `OTP Expired` (410) |
| `123456789018` | OTP `121811` → `Request under process` (retried twice, then 409) |
| `123456789020` | `Source Unavailable` (503) |
| `1234567890123` | `Invalid Aadhaar number pattern` (422, rejected locally) |

Any other 12-digit number falls through to the happy path with OTP `121212`.

### OTP request returns 503

Sandbox may report `Source Unavailable` even if its upstream has already sent an
OTP. If the error response includes a valid reference ID, the backend uses that
session so the user can enter the delivered code. Without a reference ID, the
backend returns `otp_request_outcome_unknown`; it does not retry the billable
request, because a retry could send another OTP. The screen explains that the
first code may have been sent but cannot be verified without a reference.

## How failures are handled

**Sandbox returns HTTP 200 for every verify outcome**, so branching on the HTTP
status alone silently treats failures as successes. The controller instead
inspects the body:

| Body | Our response |
| --- | --- |
| `status: "VALID"` | `200` + KYC record |
| `message: "Invalid OTP"` | `400 invalid_otp` |
| `message: "OTP Expired"` | `410 otp_expired` |
| `message: "Request under process..."` | retried at 2s then 5s, then `409` |
| `message: "Invalid Aadhaar Card"` | `422 invalid_aadhaar` |

The client switches on `code`, never on message text.

## Security notes

- **The Aadhaar number and OTP are redacted from request logs.** The global
  logger in `src/app.ts` prints `<redacted>` for `/aadhaar-kyc` paths. Keep this
  guard if the route is ever moved or another provider-specific path is added.
- The raw Aadhaar number is never echoed back to the client — only a masked
  form like `XXXXXX9012`.
- Verification logs contain only the outcome; they never include returned KYC
  fields such as name, birth date, address, portrait, or contact hashes.
- The API secret is server-side only; the app talks exclusively to our backend.
- **Results are not persisted.** No Prisma model, no writes. The record lives in
  component state and is discarded when the screen unmounts. Adding storage
  later would need a new table and a data-retention decision.

## Rate limits

25 requests/min on the test host, 500/min in production.