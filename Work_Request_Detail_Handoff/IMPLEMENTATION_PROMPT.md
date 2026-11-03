# Aasaanly — Work Request Detail with Interested Service Providers
## Complete React Native implementation prompt

Use `approved_final_design.png` as the single visual source of truth. Implement this consumer-side Work Request detail screen in the existing Aasaanly Expo React Native app. Match the approved composition, typography, spacing, colors, card shapes, provider rows and CTA treatment. Do not reuse the old provider-facing customer-call layout.

## Screen purpose
A consumer reviews service providers who have expressed interest in a particular work request and chooses one provider to proceed with.

## Exact content and hierarchy
1. Header: circular mint back button; title `Work Request`.
2. Request summary card:
   - Service thumbnail (category-specific).
   - Service title, e.g. `Chimney / Hob`.
   - Category subtitle, e.g. `Chimney / Hob Service`.
   - Relative created time, e.g. `Requested 1 hr ago`.
   - Green `Active` status pill.
   - Mint location panel with `Request Location` and saved address, e.g. `Jhansi, Uttar Pradesh`.
3. Two compact action tiles:
   - Warm amber `Boost Request` with rocket icon and supporting text `Get more responses faster`.
   - Soft red `Close Request` with close icon and supporting text `Mark this request as completed`.
4. Provider section:
   - Heading `Interested Service Providers (N)`.
   - Supporting text `Service providers who want to work on your request`.
   - Search field with placeholder `Search providers`.
   - Sort control defaulted to `Best Match`.
5. Provider cards in a vertical list. Each card includes:
   - Provider profile photo/avatar and online indicator only if presence is actually available.
   - Provider/business display name.
   - Verified badge only if backend verification status is true.
   - Average rating and review count.
   - Number of completed requests/jobs.
   - Membership age/duration.
   - Primary green `Accept Interest` button.
6. Preserve the app's existing floating support/settings/debug control only if it is part of the current app shell. Do not add it to this design if absent.

## Visual reference measurements
Reference canvas: 1024 × 1536 px.
- Header starts around x32, y70; back circle 88 × 88.
- Request card: x31, y188, width 962, height 393, radius 42.
- Service art approx. 240 × 210; request copy begins x333.
- Location panel sits at bottom of request card, approx. 98 px high.
- Action tiles: x31, y609, width 962, height 136, two equal columns with 22 px gap.
- Provider section begins around y790.
- Search/sort row approx. 66 px high.
- Provider cards approx. 160 px high with 18 px vertical gaps.
- Avatar approx. 122 px diameter.
- Accept action approx. 233 × 91 px.
Use responsive flex layouts and safe-area insets in React Native. These are screenshot design-canvas measurements, not device-independent units.

## Design tokens
- Primary green `#079B60`; deep green `#07864F`.
- Mint `#E5F8EF`; pale mint `#DDF7EB`.
- Page background `#F5F9FC`; card white.
- Main text `#101A35`; secondary `#52617F`; borders `#E1E7EE`.
- Boost tile: pale warm amber with orange-brown text.
- Close tile: pale red with red text.
- Provider cards: white with subtle cool shadow and generous rounded corners.
- Keep consistent font weights and sizes. Use the existing app typography if it is already configured.

## Data integration (must inspect before coding)
Inspect current request detail API/types, interested-provider endpoint, provider profile fields, ratings/review counts, completed-job count, joinedAt/createdAt, verification flags, profile photo URL, online status, boost flow, close-request flow, accept-interest mutation, navigation and pagination. Reuse existing endpoints and models; do not invent new APIs or hardcode the sample data.

Bind each card to live data:
- Provider name and avatar.
- Verification state.
- Rating and review count.
- Completed requests.
- Membership age calculated from provider join date.
- Interest status and action state.

The screenshot's three providers and values are visual sample content only. Do not hardcode Amit Home Services, Sharma Kitchen Services, EcoFix Appliances, their ratings, job counts or tenure into production.

## Interactions
- Search filters provider cards by name using the existing list/query behavior.
- Sort menu should use supported sort modes and real provider fields. `Best Match` is the default if supported by product logic.
- Accept Interest invokes the existing consumer-side accept/select-provider action. Show pending state, prevent double submission, handle errors, then update the card/request state after confirmed success.
- Confirm whether accepting an interest is a selection, contact unlock, chat initiation or booking step from existing product behavior; preserve that flow. Do not claim a booking is confirmed unless backend confirms it.
- Boost Request navigates to the existing Boost Request flow.
- Close Request opens the existing confirmation flow and updates status only after successful confirmation.
- Keep request location read-only.
- Preserve loading, empty, error, pagination/infinite-scroll, pull-to-refresh, analytics and accessibility.

## Assets included
- `assets/chimney_hob_service_art.png`: sample service illustration crop from approved design. Use category-mapped image in production.
- `assets/provider_amit_sample.png`, `provider_sharma_sample.png`, `provider_ecofix_sample.png`: sample avatar crops for visual prototype only. Production must use provider profile image URLs or existing avatar fallback.
- Separate SVG icons: back, clock, location, rocket, close-circle, search, sort, check, verified, star, briefcase and calendar.
Use existing SVG rendering support and existing icon infrastructure; do not add duplicate icon packages.

## Acceptance checklist
- No `Call` or `I'm Interested` buttons from the old provider-facing request card.
- Provider list is the primary content beneath request summary/actions.
- Each provider card clearly shows all requested profile signals.
- `Accept Interest` is the prominent per-provider action.
- Search and sort are functional and connected to real data.
- Boost/Close actions preserve existing app flows.
- No fake verification, ratings, jobs completed, tenure or online presence.
- Verify Android/iOS layouts, long business names, missing photos, empty provider list, large provider count and accessibility font scaling.

## Final implementation report
List changed files, APIs/components reused, how each provider field is sourced, acceptance behavior, tests run, and any deviations from the reference.
