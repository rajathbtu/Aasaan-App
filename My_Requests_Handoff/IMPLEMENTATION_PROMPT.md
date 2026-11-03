# Aasaanly — My Requests (Active) Final Implementation Prompt

Use `approved_final_design.png` as the authoritative visual reference. The design is a 1024 × 1536 canvas; `index.html` and `styles.css` use proportional scaling and reference-based absolute geometry. Implement the same screen natively in the existing Aasaanly Expo React Native app.

## Product decisions (must preserve)
- This is the consumer's **My Requests** screen, with Active Requests and Completed tabs.
- A request card contains only service image, service title, service category/subtitle, request time, Active status, and the **non-editable request location**.
- Do NOT show customer name, “the end user”, Call, “I'm Interested”, service-expert response controls, or an editable/selectable location row.
- Location is display-only: label `Request Location` and the address recorded on the request (e.g. `Jhansi, Uttar Pradesh`). Do not add a chevron or edit affordance.
- Do not put the card into a provider-facing response/lead workflow. This is consumer-side request history.

## Exact visual hierarchy
1. Header: large bold “My Requests”; supporting line “Track and manage your service requests”; round notification bell at upper right with small unread dot.
2. Tabs: broad light-grey pill track. Active Requests selected in green with white count badge; Completed unselected with count badge.
3. One large white rounded request card with soft shadow:
   - Top row: service illustration on a pale blue rounded square; service title; service category; clock icon and relative time; green Active badge at right.
   - Thin divider.
   - Bottom row: mint circular location icon; small label “Request Location”; bold actual request address.
4. Floating green settings button near lower-right area, only if the existing settings/debug control is part of the current app. Do not invent a new settings destination.
5. Bottom navigation: Create, My Requests (selected), Profile.

## Reference geometry (1024 × 1536)
- Header left 47, top 111; title 54px; subtitle 29px; bell 91 × 91.
- Tabs left 24, top 269, width 976, height 93.
- Request card left 22, top 406, width 980, height 389; radius 47.
- Service art 194 × 186, card inset 33.
- Service title 39px; category 30px; time 27px.
- Divider across card inner width.
- Location icon 88 × 88; label 25px; address 31px bold.
- Floating settings control 116 × 116.
- Bottom nav 195px high, rounded top corners.

Use proportional scaling or responsive constraints rather than hardcoded device pixels in React Native. The dimensions are visual reference measurements, not dp values.

## Visual tokens
- Green: `#079B60`; dark green: `#07864F`.
- Mint: `#E5F8EF`.
- Page: cool off-white `#F5F9FC`.
- Main text: `#101A35`; secondary: `#5D687A`.
- Borders: `#E4E9EE`.
- Rounded white card, subtle cool shadow, clear typography, no extra decorative content.

## Data and behavior
- Load active/completed requests from existing consumer request APIs.
- Counts reflect actual list lengths.
- Bind service title, category, image, createdAt and immutable request address from the saved request.
- Relative time should use existing app formatter and update appropriately.
- Tapping a request card may open its existing consumer request detail screen. Do not add provider actions.
- Tabs switch between Active and Completed lists.
- Notification bell uses existing notification route.
- Bottom navigation uses existing routes.
- Empty states should follow existing Aasaanly components and design tokens.
- Preserve loading, error, pagination, pull-to-refresh and accessibility behavior already implemented.

## Asset guidance
Use `assets/ac_service_illustration_reference.png` as the visual reference for the service thumbnail. In production, prefer the app's existing service image for the request category; do not hardcode an AC image for every service. Separate SVG icons are included in `assets/`.

## Before coding
Inspect the existing screen, API response types, navigation, service-image mapping, request status enums, tabs and bottom navigation. Preserve backend contracts and current app behavior. Do not invent data or modify unrelated screens.

## Acceptance checklist
- No customer/end-user name.
- No Call button.
- No “I'm Interested” button.
- No editable/selectable location affordance.
- Request location is a plain display-only field.
- Card matches the approved reference hierarchy and spacing.
- Active and Completed counts are dynamic.
- Consumer routes and existing APIs remain intact.
- Test Android and iOS safe areas, smaller screens, long service names and long addresses.
