# Aasaanly Service Provider Home — FINAL APPROVED DESIGN HANDOFF

## Source of truth
The three images in `design-references/` are the approved design references. Match them closely. Do not reinterpret, modernize, rearrange, simplify, or replace the approved UI. `index.html` is the interactive reference; the other HTML files isolate the key states.

### Preview files
- `index.html` — full provider home, initial state, scroll to trigger the banner collapse and return to top to expand.
- `initial-page.html` — static initial page with full hero/filter area and expanded Professional banner.
- `scrolled-page.html` — static scrolled page with the intro/selected location out of view, filter strip pinned under the app bar, and compact Professional banner.
- `banner-scroll-animation.html` — full interactive page dedicated to testing scroll-triggered expand/collapse.
- `banner-expanded.html` — isolated expanded Professional banner.
- `banner-compact.html` — isolated compact Professional banner.
- `styles.css` — shared visual styling.
- `assets/` — SVG vector icons and illustrations.
- `design-references/` — exact uploaded PNG references.

Open the HTML files directly in Chrome at 390 CSS px width (also verify 360 px). The HTML is a handoff/prototype, not a WebView deliverable.

## 1. Approved work request card — visual lock
Match `01-approved-modern-layered-card.png`. Treat the screenshot as the visual source of truth. Preserve:
1. Service image in a rounded pale-blue square at left.
2. Request title and service category at right.
3. Distance and posted time in one metadata row with pin/clock icons and a vertical separator.
4. Green Interested status pill in the upper-right position exactly as shown in the approved card reference.
5. Full-width pale-green location strip, green pin, bold locality and circular navigation affordance at right.
6. Up to three rounded service tags, each with its own icon and label.
7. Thin divider.
8. Customer identity row with avatar, customer name and `Customer` role.
9. Bottom action row with `Call` and green `I'm Interested` buttons side by side, as shown in the approved card image.

Keep the card's white surface, subtle green border/shadow, rounded corners, pale-blue image tile, pale-green address strip, chip shape, typography hierarchy and button positions. Do not change card width to an unrealistic device size. Do not drop customer details, distance, posted time, address or tags.

The uploaded card reference visibly includes an Interested pill at the upper right and an `I'm Interested` action in the footer. Match the supplied reference rather than silently removing either element. Use the existing app's request state to decide when the upper pill is displayed; do not invent state semantics.

### Tags
- Support up to three tags.
- Keep each tag as an individual rounded chip with icon and readable label.
- Allow natural wrapping for narrower devices or longer labels.
- Never truncate labels, force overflow, or add horizontal scrolling.
- Keep the same visual style and gap as the approved reference.

### Call and interest logic
Keep the action buttons in the footer, Call left and Interested right. Inspect the current backend state model before implementation. Call must remain disabled until the customer has accepted the provider's interest. A provider merely tapping Interested must not enable Call. Map the actual backend states; do not invent API status values or transitions.

## 2. Approved full home page
Match `02-approved-provider-home-initial-and-scrolled.png`.

### Initial page (left phone)
- Native status bar.
- Aasaanly logo at left; notification and profile icons at right.
- Selected location row: pin + `Jhansi, Uttar Pradesh` + dropdown.
- Intro hero with pale green background, `Find work near you`, supporting text and toolbox illustration.
- Distance and time filter chips below hero: `Within 3 km`, `Last 24 hrs`; separate sliders/filter action.
- Work-request list using the locked card design.
- Purple Professional banner floating above bottom navigation, expanded.
- Bottom navigation: All (active), Interested (count), Closed.

### Scrolled page (right phone)
- App logo and notification/profile actions remain at top.
- Intro hero and location row have scrolled out of view.
- Filter chips become the first content row directly under the app bar and remain sticky.
- Work-request cards retain the exact same dimensions, structure and content hierarchy. Cards do not expand or compact on scroll.
- Professional banner is compact and floating above the bottom navigation.
- Bottom navigation remains fixed and accessible.

The filter row uses the selected values shown in the reference. Preserve existing filter behaviour and wire it to live app state.

## 3. Professional banner — approved design and animation
Match `03-approved-professional-banner-states.png`.

### Expanded state
- Fixed/floating above bottom navigation.
- Purple gradient rounded rectangle with subtle shadow.
- Crown icon in translucent circular tile at left.
- `Upgrade to Professional` title and `PRO` pill.
- Supporting line: `Get early access to more work requests`.
- Close (X) button at top right.
- Four equal benefit columns with vector icons and labels:
  - Early Access
  - More Work
  - Pro Badge
  - Priority Support
- Full-width white `Upgrade Now →` CTA at bottom.

### Compact state
- Same purple gradient and rounded surface.
- Crown icon at left.
- `Upgrade to Professional` title and `PRO` pill.
- Circular white expand/up-chevron button at right.
- Hide subtitle, close button, benefits and CTA.
- Keep banner floating above bottom navigation.

### Transition rules
1. On initial load at top: expanded.
2. When the user scrolls down past the configured threshold: animate to compact.
3. Keep compact while user continues scrolling.
4. When user scrolls back to the top: animate to expanded.
5. Tapping the compact banner's expand chevron expands it.
6. Close (X) in expanded state dismisses the banner for the session.
7. Upgrade Now navigates to the existing Professional plans screen.
8. The banner stays fixed above bottom navigation; it is not a list item and must not push/resize the cards.
9. Only the banner changes size. Do not animate or compact the request cards, customer details, tags, or filters.
10. Use a smooth height/padding/opacity transition with no flicker or layout jump. Keep the list scroll position stable.

## 4. Fixed bottom navigation
Exactly three destinations:
- All (active by default)
- Interested (show count when supplied)
- Closed

Keep icon above label and selected state in the pale-green rounded tile. Navigation remains fixed at bottom and respects Android safe areas. Reuse existing navigation/filter state.

## 5. Layout and responsive constraints
- Design against standard Android mobile content widths: 360–390 dp.
- Use full available device width with standard side margins; never widen the mock device or use desktop width to solve spacing.
- No horizontal page overflow.
- Long address and tag labels wrap safely.
- Ensure last card can scroll fully above the floating banner and bottom navigation.
- Keep system status/navigation bars native; do not draw app content over them.
- Keep the banner above the bottom navigation with consistent spacing.

## 6. Vector assets
All supplied icons and illustrations are standalone SVG files under `assets/`. Reuse them where appropriate or map to the matching existing icon library in the app. Do not substitute emoji. The toolbox illustration belongs in the hero; the air-conditioner illustration belongs in the request card.

## 7. Engineering instructions
Before coding:
1. Inspect the current service-provider home screen, request card, navigation, filters, location selector, Professional banner and request status model.
2. Report existing components and state/API mappings.
3. Identify differences between existing business logic and the visual states before changing anything.

Implementation:
- Implement in the existing Expo React Native architecture and styling conventions.
- Do not ship this HTML as a WebView.
- Preserve existing API calls, filters, permissions, navigation and subscription flow.
- Reuse existing components and state management where possible.
- Keep banner animation state independent from request card state.
- Use a stable scroll threshold/hysteresis so the banner does not flicker around the threshold.
- Add correct bottom content inset for the fixed banner + bottom navigation.
- Preserve existing loading, empty, offline and error states.

## 8. Acceptance checklist
- [ ] Card visually matches the approved card reference.
- [ ] All card details remain present.
- [ ] Three tags render and wrap cleanly.
- [ ] Green Interested pill appears according to actual request state.
- [ ] Call and I'm Interested stay in the footer in the shown positions.
- [ ] Call disabled until customer acceptance.
- [ ] Initial page matches left phone reference.
- [ ] Scrolled page matches right phone reference.
- [ ] Hero/location scroll away; filter strip sticks below app bar.
- [ ] Cards do not change size when scrolling.
- [ ] Banner expanded on initial load.
- [ ] Banner compacts smoothly on scroll down.
- [ ] Banner expands again at top and on compact-chevron tap.
- [ ] Close dismisses for session; Upgrade Now opens existing plans flow.
- [ ] Banner never covers card actions.
- [ ] Bottom tabs remain fixed and functional.
- [ ] Test at 360 dp and 390 dp, including long locality and three tags.
- [ ] Existing app logic and tests remain intact.

## 9. Agent final report
Report files changed, existing components reused, state/API mapping, scroll threshold and animation approach, bottom inset/safe-area handling, test widths/results, and any deviation from the supplied reference with justification.
