# Aasaanly — Work Request Created Screen (Final Approved Design)

Implement the exact approved success screen in the existing Aasaanly Expo React Native app. The authoritative visual reference is `approved_final_design.png`. Do not use earlier concepts or alternate layouts.

## Exact approved composition (top to bottom)
1. **Header:** Aasaanly wordmark aligned left; circular close (X) button aligned right.
2. **Success hero:** Two-column composition. Left: “Your Work Request is Created!” with “Created!” in green and celebratory accent, plus “We’ve shared your request with nearby verified service experts.” Right: friendly relaxed customer illustration with green success-check bubble and subtle mint backdrop. The hero is an illustration, not a large standalone check badge.
3. **Request summary card:** White rounded card with service thumbnail on the left, vertical divider, dynamic service name (example “Chimney / Hob”), “Service Request”, clock icon and “Requested just now”, plus a mint “Live” pill on the right only when the returned status supports it.
4. **Service location row:** Full-width pale mint row with location-pin bubble, “Service Location”, selected address and right chevron.
5. **Action row:** Two side-by-side actions. Secondary outlined “Share Request”; primary green “View My Requests” with list icon and right chevron.
6. **One “What’s Next?” section:** A single white rounded card with a vertical three-step timeline. Steps:
   - “Experts are notified” — “Nearby verified experts receive the request.”
   - “Compare responses” — “Review profiles, ratings and quotes.”
   - “Choose your expert” — “Contact and hire the right professional.”
   Each step has a numbered mint circle, a separate mint icon tile (bell, layers, handshake) and title/body. Connect number circles with a thin mint vertical line.
7. **Boost banner:** Warm pale yellow/cream rounded banner at the bottom. Rocket illustration on left; “Want faster responses?” and supporting text in the center; outlined green “Boost Request” action on the right. Maintain the approved compact horizontal banner composition.

## Critical design correction
There must be **no horizontal request status timeline** (no “Request Created → Experts Respond → You Choose & Hire” row). The only progress/explanation component is the single vertical “What’s Next?” card. Do not duplicate its three stages elsewhere. This was the explicit final design decision.

## Visual styling
Use the same Aasaanly consumer design language:
- Primary green #079B60; dark green #07864F.
- Mint #E8F8F0; mint accent #DDF7EA.
- Background #F7FCF9; text #101D2D; secondary #536176.
- Rounded white cards with subtle shadow/border, restrained spacing and clean type hierarchy.
- Keep the hero text left aligned and illustration on the right.
- Match the approved screen's order, card dimensions, icon placement, and horizontal/vertical rhythm as closely as possible.

## Assets
- `assets/success_hero_illustration.svg`: customer/celebration illustration for hero.
- `assets/service_chimney.svg`: sample Chimney / Hob thumbnail only. In production use the existing service image/icon resolver for the actual selected service.
- `assets/boost_rocket.svg`: boost banner rocket illustration.
- Remaining SVGs: location, clock, share, list, bell, layers, handshake, chevron, close, bolt.
Reuse existing app SVG pipeline or icon registry. Do not add unnecessary dependencies. Do not use screenshot as a UI background.

## Data and behavior
- Bind service title, category, service thumbnail, request timestamp, status, and location to the actual created request.
- Do not hardcode the sample service or address.
- Show “Live” only if the current API/status model supports it; do not invent a status.
- Close uses current navigation behavior.
- Share Request uses native share sheet and safe request details.
- View My Requests opens existing route and may focus the newly created request if supported.
- Boost Request opens existing boost flow; hide/disable if the feature or request eligibility is unavailable.
- Preserve all existing API contracts, navigation and error handling.

## Responsive/accessibility
Support small Android/iOS devices, safe areas, dynamic text, long service names and addresses. Keep action targets accessible. The page should scroll naturally when needed. Avoid horizontal overflow and nested vertical scroll views.

## Validate
Verify the single vertical timeline is present and the horizontal timeline is absent. Test different service categories and matching thumbnails, optional status, long addresses, all actions, small screens, safe-area insets, TypeScript, lint and relevant tests.

## Final report
List changed files, existing integrations reused, dynamic fields, tests/results, and any visual deviations from the approved reference.
