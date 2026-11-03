# Aasaanly — Work Request Created Confirmation
## Exact final implementation prompt for the coding agent

Implement the consumer-side Work Request Created confirmation screen in the existing Aasaanly Expo React Native app. Use `approved_final_design.png` as the single visual source of truth. Match its hierarchy, spacing, illustration placement, colors, rounded cards, typography and action buttons. Do not reuse the old confirmation layout or invent a new structure.

## Required screen content, in order
1. Header:
   - Aasaanly wordmark aligned to the left.
   - Circular white close button aligned top-right.
   - Respect Android/iOS safe areas and native status/navigation bars.
2. Success hero:
   - Heading on the left: `Your Work Request is Created!` with `Created!` in Aasaanly green and celebratory accent.
   - Supporting copy: `We’ve shared your request with nearby verified service experts.`
   - Large green 3D-style success/check illustration on the right (`assets/success_check_illustration.png`).
3. Request summary card:
   - Category-specific service image (`assets/chimney_hob_service_illustration.png` is only a sample).
   - Service name, e.g. `Chimney / Hob`.
   - Subtitle `Service Request`.
   - Request creation time using relative time, e.g. `Requested Just now`.
   - Green `Live` status pill.
4. Request location panel:
   - Location icon.
   - Label `Request Location`.
   - Saved request address, e.g. `Jhansi, Uttar Pradesh`.
   - Chevron only if tapping expands a location detail preview; location must not be editable here.
5. Two primary actions side-by-side:
   - White outlined `Share Request` button with share icon.
   - Green `View My Requests` button with list icon and trailing chevron.
6. `What happens next?` section:
   - One horizontal three-step process, not a second timeline or duplicate explanatory section.
   - Step 1: `Experts are notified` / `Nearby verified experts receive your request.`
   - Step 2: `Compare responses` / `Review profiles, ratings and quotes.`
   - Step 3: `Choose your expert` / `Contact and hire the right professional.`
   - Use circular mint icon backplates, small numbered green badges and subtle directional arrows between steps.
7. Bottom promotional banner:
   - Rocket illustration (`assets/boost_rocket_illustration.png`).
   - Heading `Want faster responses?`
   - Copy `Boost your request to get more views and replies quickly.`
   - Outlined green `Boost Request` action.

## Reference canvas measurements
The supplied final artwork is 1024 × 1536 px. The HTML/CSS prototype uses this canvas and proportional scaling.
- Header starts around x51, y55.
- Hero begins around y150; left text block and right success artwork.
- Request card: x40, y468, width 944, height 206.
- Location panel: x41, y701, width 942, height 98.
- Actions: x43, y823, width 938, height 83, two equal columns.
- What happens next card: x36, y940, width 952, height 361.
- Boost banner: x35, y1330, width 953, height 171.
Use responsive flex layouts, safe-area insets and proportional spacing in React Native. Screenshot measurements are visual reference pixels, not dp values.

## Design tokens
- Primary green: `#079B60`; deep green: `#07864F`.
- Mint: `#E5F8EF`; pale mint: `#DDF8EC`.
- Background: cool pale mint/off-white (`#F5FBF9`).
- Main text: `#101A35`; secondary text: `#5D687B`.
- Borders: `#E1E9ED`.
- Cards are white with large rounded corners and restrained soft shadows.
- Use existing Aasaanly font setup and typography components if available.

## Data and behavior
- Bind service title, category, service image, request timestamp, status and saved location from the created request response or existing request detail API.
- Do not hardcode `Chimney / Hob`, `Jhansi, Uttar Pradesh`, `Live` or `Requested Just now` in production.
- Share Request invokes the platform-native share sheet with a deep link/request summary where supported.
- View My Requests navigates to the existing consumer My Requests route.
- Close button follows the existing success-screen close/back behavior.
- Boost Request navigates to the existing boost flow for this exact request ID.
- Location is informational/read-only. Do not present an edit action.
- Ensure request creation is not repeated if the screen is reopened or re-rendered.
- Preserve existing analytics, error handling, loading behavior and navigation contracts.

## Assets included
- `assets/success_check_illustration.png`: exact success/check artwork crop from approved design.
- `assets/chimney_hob_service_illustration.png`: sample service artwork crop.
- `assets/boost_rocket_illustration.png`: exact rocket artwork crop.
- `assets/status_bar_reference.png`: reference crop only; do not render this image over native status bars in production.
- Separate SVG icons: close, clock, location, share, list, chevron, bell, chat, handshake and bolt.
Reuse the app's existing SVG/icon rendering infrastructure. Do not add duplicate icon libraries.

## Implementation constraints
- Inspect existing route, request creation response, request data types, app navigation, share/deep-link behavior, My Requests route and Boost Request route before coding.
- Preserve existing API contracts and request lifecycle.
- The three steps are explanatory only; do not model them as duplicate request status timelines.
- Keep the boost banner secondary to the successful request confirmation.
- Avoid overflow on smaller devices; allow vertical scrolling if required.
- Test Android and iOS safe areas, long service names, long addresses and different service image aspect ratios.

## Acceptance checklist
- Visual structure closely matches `approved_final_design.png`.
- Success message and green check illustration form the hero.
- Request summary has Live status and relative timestamp.
- Location appears once as a read-only panel.
- Exactly two primary actions: Share Request and View My Requests.
- Exactly one three-step `What happens next?` section.
- One secondary boost banner with rocket artwork.
- No duplicated timeline, repeated steps or old confirmation card.
- All data and actions use existing Aasaanly routes/APIs.
- Provide changed-file list, reused components/routes, tests run and any design deviations.
