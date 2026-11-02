# Aasaanly — Name & OTP Verification Screen Handoff

## Source of truth
- `assets/reference-approved-screen.png` is the complete approved visual reference.
- `assets/illustrations/name-verification-illustration.png` is the cropped illustration taken directly from that approved reference. Do not redraw or replace it.
- The HTML preview demonstrates the layout and interaction only. Match the supplied reference image first where a visual discrepancy exists.

## Screen purpose
Collect the service provider/customer full name and verify the already-entered Indian mobile number with a four-digit OTP before continuing onboarding.

## Layout
- Mobile-first viewport: 9:16 reference; implementation must adapt to common Android widths (360–430 CSS px) without stretching.
- White background, centered content column, 20px horizontal page gutters on a 390px viewport.
- Top status area, compact back/header row, centered identity-verification illustration, title and supporting sentence.
- Full Name field.
- Read-only verified-destination mobile number row with country flag, +91, masked/confirmed number and Change action.
- Four separate OTP digit cells, auto-advance, backspace navigation and paste support.
- Countdown and Resend OTP.
- Full-width primary Verify & Continue button.
- Support contact line and secure-data reassurance strip.
- Respect device safe areas and keyboard insets; allow vertical scrolling when the keyboard is open.

## Visual tokens
- Primary green: #079653; bright green accent: #08B878; dark green: #078447.
- Mint surface: #E8F8F0; subtle mint: #F2FBF6.
- Primary text: #17202B; secondary text: #657080; border: #D9DEE5; input fill: #F1F2F5.
- Font: Inter if already bundled in app, otherwise system sans-serif (Roboto on Android). Do not add a new font dependency solely for this screen.
- Rounded fields 14px; primary CTA 16px; icon tiles 10px; consistent 8px spacing rhythm.
- Use green only for actions, active focus, confirmation and security cues.

## Behavior
1. Full name is required; trim whitespace and validate a sensible minimum length before enabling continuation.
2. Mobile number is the destination used for OTP. Change opens the existing mobile-number edit flow; do not hardcode the demo number.
3. OTP is exactly four numeric digits. Auto-focus next cell after entry; backspace moves to prior cell; distribute pasted 4-digit code across cells.
4. Resend remains disabled while countdown is active. On expiry enable resend; after successful resend restart timer and clear OTP.
5. Verify & Continue is disabled until name is valid and all four digits are present. Loading state must prevent duplicate submissions.
6. API errors should be shown inline near OTP, preserving the entered name and phone number. Never show a success state until backend verification succeeds.
7. Support email opens the device email composer.

## Implementation notes
- Replace sample mobile number and static timer with actual app state/API data.
- Wire resend and verify to existing authentication endpoints. Do not implement fake OTP verification.
- Use the existing navigation stack for back and Change.
- Do not include any floating settings/debug gear from the old screenshot.
- Do not use the generated screenshot as a full-screen background; implement controls natively.
