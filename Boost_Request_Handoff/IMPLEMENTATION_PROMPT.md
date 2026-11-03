# Aasaanly — Boost Request Screen: Exact Final Implementation Prompt

Implement the Boost Request screen in the existing Aasaanly Expo React Native app. The authoritative visual reference is `approved_final_design.png` (1024 × 1536). Match this composition and styling; do not revert to the old form layout or introduce unrelated design patterns.

## First inspect the existing app
Locate the current Boost Request route, request summary model, boost pricing/configuration, wallet/payment integration, credit-points balance and eligibility rules, payment gateway, loading/error states, navigation, design tokens and shared components. Preserve the existing contracts and business rules. Do not invent endpoints, price values, payment methods or eligibility behavior.

## Exact screen structure, top to bottom
1. **Header:** mint circular back button and bold “Boost Request” title. Retain native status/navigation bars and safe areas.
2. **Request summary card:** rounded white card with service thumbnail, service title, service category/subtitle, clock icon and “Requested just now” relative timestamp. Add a mint location pill with pin icon and the saved request address (sample shown: “Jhansi, Uttar Pradesh”). The location is display-only; no edit affordance.
3. **Boost hero banner:** soft mint gradient panel. Text: “Get More Responses”, italic green “Faster!”, and “Boost your request to reach more verified service experts quickly.” Use the supplied rocket illustration `assets/boost_rocket_illustration.png`.
4. **Benefits section:** heading “What You’ll Get with Boost” and three horizontally aligned benefit items: Higher Visibility (bolt), Top Placement (trophy), Urgent Badge (badge/star). Use mint icon tiles and vertical separators.
5. **Payment section:** heading “Choose a Payment Option”. First option is selected by default only if that matches current product/payment logic: “Pay with Money”, subtitle “One-time boost for this work request”, price pill “₹100”. Second option: “Use Credit Points”, current balance and required points; show shortfall text when balance is insufficient. The screenshot uses 0 points, needs 100 more points, and shows 100 pts.
6. **Primary CTA:** full-width green button with bolt icon and “Pay ₹100 & Boost Now”. Price and label must be dynamically bound to the actual boost price/payment selection.

## Visual reference geometry (1024 × 1536 design canvas)
- Header: x37, y67; back circle 79 × 79.
- Request card: x37, y181, width 950, height 251, radius 39.
- Service image: approx. 216 × 188; vertical divider next to it.
- Hero banner: x41, y471, width 945, height 244, radius 34.
- Benefits heading begins around y754; three items in one row with 85px mint icon tiles.
- Payment section begins around y958; heading and two 129px payment option cards.
- CTA: x45, y1368, width 934, height 93.
Use responsive constraints and safe-area handling in React Native; these canvas dimensions are visual reference measurements, not dp values.

## Design tokens
- Primary green `#079B60`; dark green `#07864F`.
- Mint `#E5F8EF`; pale mint `#DDF5E9`.
- Background `#F5F9FC`; white cards.
- Main text `#101A35`; secondary text `#52617F`; border `#E1E7EE`.
- Use rounded cards, restrained soft shadows, clean bold typography and green/mint accents.

## Assets
- `assets/boost_rocket_illustration.png`: exact rocket artwork crop from the approved final design.
- `assets/service_ac_thumbnail.png`: sample service image crop from the approved design. Production must use the correct image for the selected request category, not always this AC image.
- `assets/*.svg`: separate UI icons for back, clock, location, bolt, trophy, badge, wallet, coins, check and radio.
Use existing app SVG/icon rendering dependencies and aliases. Do not add a new icon library if the project already has one.

## Functional requirements
- Bind request service name, category, thumbnail, created time and saved location from the actual request.
- Location is read-only on this page.
- Benefits are informational.
- Read boost price from existing config/API; do not hardcode ₹100 if production pricing differs.
- Read wallet balance and credit-points balance from existing sources.
- Enforce existing points eligibility and sufficient-balance rules. If points are insufficient, disable that payment option or present the established purchase/top-up path; do not allow an invalid payment.
- Switching payment method updates selected styling and CTA label/amount.
- Payment CTA must invoke existing payment initiation flow, prevent duplicate submissions, show global loading state, handle gateway callbacks/failure/cancellation and only mark the request boosted after confirmed success.
- Preserve analytics/events and error handling already used by the app.

## Acceptance checks
- Match reference hierarchy and visual spacing at the reference aspect ratio.
- Request card includes location pill, not an editable selector.
- Rocket artwork appears in the mint hero panel.
- Benefits are three equal visual items in one row.
- Both payment choices show accurate balance/eligibility.
- CTA amount reflects selected valid payment method.
- Android and iOS safe areas, small screens, long service names and keyboard/payment overlays are handled.
- No changes to unrelated screens or backend contracts.

## Final report
List modified files, existing components/APIs reused, payment behavior preserved, tests run and screenshot comparison results. Note any deviations from the supplied reference.
