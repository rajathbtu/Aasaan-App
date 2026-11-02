# Aasaanly — Choose Your Role
## Final UI/UX and engineering handoff

### Source of truth
`design-reference/final-approved-role-selection.png` is the approved visual reference. The HTML/CSS/JS files reproduce the direction in a standard phone-width preview. Keep the two role choices and their content intact. Do not replace the roles with a generic radio list or a simple two-option form.

### Target viewport
- Design width: 390 dp.
- Support: 360–390 dp.
- Do not stretch content on tablet/desktop; center a phone-width preview.
- Respect Android status bar, navigation bar and safe-area insets.
- Main content may scroll vertically; bottom Confirm Selection action stays fixed.

### Screen hierarchy
1. Native status bar.
2. Header row:
   - Circular pale-mint back button.
   - Bold `Choose Your Role` title.
3. Intro/hero:
   - Prompt: `How would you like to use`
   - Brand emphasis: `Aasaanly?` in green.
   - Supporting copy: `Choose the role that best fits your needs.`
   - Soft neighborhood / home illustration in the background.
4. Consumer role card:
   - Consumer badge with person icon.
   - Heading: `Find Experts to Get Work Done`.
   - Description: `Hire verified and skilled professionals for your home, business and everyday needs.`
   - Benefit points: Verified Experts, Quick Booking, Nearby Services.
   - Consumer illustration on right.
   - Unselected state: white surface, subtle border/shadow, hollow radio circle.
5. Service Expert role card:
   - Service Expert badge with briefcase icon.
   - Heading: `Find Work & Grow your Earnings`.
   - Description: `Get work requests from nearby customers and grow your service business.`
   - Benefit points: Get Work, Increase Earnings, Build Your Brand.
   - Service expert illustration on right.
   - Selected state in initial reference: pale mint background, green border and filled green check circle.
6. Fixed bottom action:
   - Full-width green `Confirm Selection` button with right arrow.

### Interaction rules
- Exactly one role may be selected at a time.
- Initial preview state: Service Expert selected.
- Selecting Consumer moves selected styling to Consumer.
- Selecting Service Expert moves selected styling to Service Expert.
- Confirm Selection submits the currently selected role through the app's existing onboarding flow.
- Back uses existing app navigation.
- Do not assume the role is saved until the existing API/store reports success.

### Theme and visual tokens
- Primary green: `#079B5C` / button green `#08AD73`.
- Dark green: `#087F50`.
- Mint surface: `#E8F8EE`.
- Selected card surface: `#EDFBF3`.
- Main text: `#172027`.
- Secondary text: `#596575`.
- Border: `#DFE8E4`.
- White surfaces, rounded 20–24 dp cards, restrained shadows.
- Reuse the existing Aasaanly app font and shared theme tokens if present. Prototype uses system sans-serif as fallback.
- Use the supplied SVG icons and illustrations or map them to equivalent existing vector assets. Do not substitute emoji.

### Included assets
- `assets/icons/`: back, consumer, expert, shield-check, bolt, pin, calendar, coins, award, check, arrow and radio states.
- `assets/illustrations/neighborhood.svg`: subtle city/home backdrop.
- `assets/illustrations/consumer.svg`: consumer character illustration.
- `assets/illustrations/service-expert.svg`: service professional illustration.
- `design-reference/final-approved-role-selection.png`: screenshot source of truth.

### Native implementation requirements
1. Inspect existing role-selection component, onboarding state, role enum/model, API mutation, persistence and navigation destinations.
2. Reuse current role IDs/enum values and existing backend contract. Do not invent role names or payload fields.
3. Implement natively in existing Expo React Native app; do not ship HTML as a WebView.
4. Reuse shared typography, spacing, button, header, colors and icon components where available.
5. Make card selection accessible (`accessibilityRole`, selected state, labels).
6. Confirm should have loading/disabled state during submission, prevent duplicate taps, show existing error handling and navigate only after success.
7. Preserve existing account/role eligibility rules and multi-role behaviour if the backend supports it. The one-at-a-time visual selection must not silently remove any existing supported flow without checking it first.
8. Verify illustration sizing/cropping at 360 and 390 dp and with system font scaling.

### Acceptance checklist
- [ ] Standard 360–390 dp phone layout; no stretched width.
- [ ] Header and hero match approved design direction.
- [ ] Both role cards preserve all text and benefit details.
- [ ] Consumer and Service Expert illustrations are included.
- [ ] Selected/unselected states are visually distinct.
- [ ] Only one role selected at a time (unless current product contract explicitly supports otherwise).
- [ ] Bottom Confirm button stays visible and respects safe area.
- [ ] Existing role enum, API and navigation are used.
- [ ] Loading/error/success and duplicate-tap handling work.
- [ ] Tests pass and no onboarding regression is introduced.

### Agent final report
List changed files, shared components/tokens reused, role enum/API mapping, persistence/navigation behaviour, any existing multi-role rules found, tests run and deviations from the reference with reasons.
