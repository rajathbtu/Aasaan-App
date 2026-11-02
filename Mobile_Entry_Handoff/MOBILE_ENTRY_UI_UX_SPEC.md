# Aasaanly Mobile Number Entry — Approved UI/UX Handoff

## Source of truth
`design-reference/approved-mobile-entry-screen.png` is the exact approved reference. Match its layout, visual hierarchy, typography, colors, button treatment and illustration. The reference is a tall mobile screenshot; do not stretch the app to its pixel dimensions. Implement responsively for normal phone widths (360–430 dp) and 9:16-ish mobile viewports.

## Screen structure
1. Status bar at top.
2. Header row with circular pale-mint back button on the left and pale-mint language selector on the right. No brand logo in this header.
3. Centered smartphone/OTP illustration. Use `assets/illustrations/mobile-otp-illustration.png` exactly as supplied; it is extracted from the approved design. Do not redraw, replace or recolor.
4. Centered heading: `Welcome to Aasaanly`; Aasaanly highlighted in brand green. Subtitle: `Enter your mobile number to get started`.
5. Label row with mint phone icon tile and `Mobile Number`.
6. Single outlined rounded input: India flag + `+91` prefix separated by a vertical divider; placeholder `Enter 10-digit mobile number`.
7. Full-width green primary CTA: `Send OTP` with right-arrow icon.
8. Centered legal copy: `By continuing, you agree to our Terms of Service and Privacy Policy`; both links in green.
9. Mint social-proof panel with people icon, bold `Join 10,000+ users`, supporting copy `finding work easily on Aasaanly`.

## Design tokens
- Primary: #00A86B
- Primary dark: #008E55
- Mint surface: #E7F8EF
- Soft mint: #F0FAF5
- Ink: #17231F
- Muted text: #64748B
- Border: #DFE5E8
- White: #FFFFFF
- Canvas: #FBFDFC
- Rounded controls: 16–22 px; soft shadows only.
- Typography: use the app's existing rounded sans-serif family if already configured. Otherwise use a clean sans-serif; headings 800 weight, body regular/medium. Do not introduce an unlicensed font asset.

## Input behavior
- Numeric keyboard on mobile.
- Accept digits only; max 10 digits.
- Country prefix is fixed at +91 in this India-first flow; don't include +91 in the editable digits.
- Validate exactly 10 digits and Indian mobile first digit 6–9 before requesting OTP.
- Show inline validation under the field; retain entered digits.
- On valid input call the existing OTP API and show loading / error / success states. The HTML preview does not call a backend; connect it to the existing app flow.
- Avoid duplicate submissions while the OTP request is pending.

## Language selector
- Tap opens a compact menu; selected language is reflected in the trigger. The HTML preview demonstrates English and Hindi only. Use the app's actual supported language list and localization state in production.

## Navigation and legal links
- Back button must use existing onboarding navigation.
- Terms and Privacy links must use the app's actual URLs/routes. The `#` values in the HTML are placeholders only.

## Assets
- `mobile-otp-illustration.png`: exact approved artwork crop, raster PNG.
- `assets/icons/*.svg`: editable vector icons for back, globe, chevron, phone, phone-call, arrow, users, check, close, info and India flag.
- Keep icons in the same stroke family, inherit brand colors, and avoid emoji or platform glyph substitutions.

## Engineering requirements
- HTML is a visual reference only. Implement natively in existing Expo React Native; do not ship a WebView.
- Inspect existing auth state, OTP endpoint, rate limits, analytics, country code behavior, localization, navigation and error handling before coding.
- Reuse existing API contracts. Do not invent a new OTP endpoint or bypass server-side validation.
- Respect safe areas, Android keyboard resize, iOS keyboard behavior, accessibility labels and font scaling.
- Test at 360, 375, 390 and 430 dp; verify no clipping, overlapping or unnecessary vertical scroll.
