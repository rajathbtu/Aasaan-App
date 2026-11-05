# KYC Code Structure

Organize KYC integrations by **provider**, then by **verification approach**. Provider and approach are separate dimensions: one provider can offer several flows, and different providers can return different data.


## Directory Layout

```text
backend/src/kyc/
  README.md
  sandbox/
    aadhaarOfflineEkyc/
      client.ts
      controller.ts
      routes.ts
    aadhaarDigiLocker/
      ...
  digilocker/
    aadhaarConsent/
      ...
  surepass/
    aadhaarVerification/
      ...

frontend/src/api/kyc/
  sandbox/
    aadhaarOfflineEkyc.ts
  digilocker/
    aadhaarConsent.ts
  surepass/
    aadhaarVerification.ts

frontend/src/screens/kyc/
  sandbox/
    AadhaarOfflineEkycScreen.tsx
  digilocker/
    AadhaarConsentScreen.tsx
  surepass/
    AadhaarVerificationScreen.tsx
```

The examples are illustrative. Keep provider and approach names descriptive and consistent across backend code, frontend API modules, screens, and URLs.

## Adding an Approach

1. Identify the integration provider and the specific flow it supports. Use a lowercase provider directory, then a descriptive approach directory, for example `sandbox/aadhaarOfflineEkyc`.
2. Put provider communication, provider-specific types, response parsing, and flow behavior in that approach's directory. Split files only where it makes the implementation easier to understand; common filenames such as `client.ts`, `controller.ts`, and `routes.ts` are conventions, not mandatory boilerplate.
3. Keep the approach's request and response DTOs local to its backend/frontend API modules. Do not make one provider's result shape look universal.
4. Use an explicit backend URL containing both dimensions, for example `/aadhaar-kyc/sandbox/aadhaar-offline-ekyc`. Mount its routes in `src/app.ts` and keep request-body redaction covering the `/aadhaar-kyc` namespace.
5. Add or wire a frontend API module and screen using the same provider/approach naming. Keep user-facing navigation names generic when they describe a product capability rather than a specific vendor.
6. Keep credentials server-side. Never log Aadhaar numbers, OTPs, portraits, or returned KYC identity fields.

If the same provider offers another approach, add it as a sibling directory, not as branches inside the existing flow. For example, a Sandbox DigiLocker-based flow belongs beside `sandbox/aadhaarOfflineEkyc`, not inside that OTP implementation.

## Shared Code

Do not introduce a provider interface, generic controller, canonical KYC DTO, or shared result union preemptively. Keep workflows and outputs independent unless a concrete cross-provider use case establishes a stable common behavior. If shared code becomes justified, keep provider-specific request/response types and flow state local, and share only the proven common part.

The current Sandbox OTP implementation is documented in [`../../README-sandbox-aadhaar-offline-ekyc.md`](../../README-sandbox-aadhaar-offline-ekyc.md).
