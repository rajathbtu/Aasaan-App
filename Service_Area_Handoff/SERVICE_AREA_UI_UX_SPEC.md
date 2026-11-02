# Aasaanly — Confirm Your Service Area
## Final UI/UX and engineering handoff

### Approved design
`design-reference/final-approved-service-area.png` is the visual source of truth. The approved version has:
- Simple profile-style header with back button and title only.
- No Aasaanly logo in this screen.
- No subheader / explanatory intro block.
- Search field directly below the header.
- Map with selected pin and visible service-radius circle.
- A dedicated “Pick My Current Location” action.
- Selected Location card with address and Change action.
- Service Radius card with 5 / 10 / 15 / 20 km choices; 20 km selected in the reference.
- Fixed bottom “Confirm Service Area” CTA.

### Target device and layout
- Reference artboard: portrait 9:16 visual composition.
- Implementation baseline: 390 dp wide phone, responsive down to 360 dp.
- Do not stretch content to tablet or desktop widths. For wide browser previews, center a phone-width device frame.
- Use Android status/navigation safe areas. Bottom CTA stays fixed; content between header and CTA scrolls.
- At shorter devices, allow the map/content region to scroll; do not compress text or controls below touch-friendly sizes.

### Screen structure
1. Native status bar.
2. Header: pale-mint circular back button + bold “Confirm Your Service Area”. Keep title left aligned beside back button, same visual language as profile screen.
3. Search field: magnifier + placeholder “Search location (e.g. Jhansi, Civil Lines)”. Provide clear affordance after text is entered. Search results should be selectable.
4. Map: actual interactive map in production, centered on selected service-area coordinate; show selected marker and radius overlay. Map controls: recenter and map layers. Keep map rounded and visually dominant.
5. “Pick My Current Location” full-width mint button with target icon.
6. Selected Location card: pin tile, “Selected Location”, selected formatted address, “Change” action.
7. Service Radius card: radius icon, “Service Radius”, helper copy “You’ll see work requests within this range.” and segmented choices 5 km, 10 km, 15 km, 20 km. Initial selected value in reference: 20 km.
8. Fixed bottom green “Confirm Service Area →” action.

### Visual tokens
- Brand green: #079B5C.
- CTA green: #08AD73.
- Main text: #172027.
- Secondary text: #657183.
- Border: #E4E9ED.
- Mint surface: #E5F8EF.
- White background and restrained soft shadows.
- Rounded search pill; 14–16 dp cards; consistent 12–14 dp CTA radius.
- Use existing Aasaanly typography and shared tokens/components in production; prototype uses system sans-serif fallback.
- SVG icons are provided in `assets/icons/`.

### Functional behaviour / production mapping
- Search location: integrate existing Places/geocoding autocomplete. Selecting a result updates map center, marker, formatted address and radius overlay.
- Pick My Current Location: request foreground location permission with a clear rationale; handle denied, permanently denied, disabled location services, timeout and success. On success, obtain coordinates, reverse-geocode, update address and map. Do not silently assume permission.
- Change: focus/open location search or existing location picker.
- Map drag: update the selected pin/coordinate according to the app's established interaction pattern. If the pin is fixed at map center, update the selected coordinate when map camera settles.
- Radius selector: single selection; update selected chip and visual circle radius. Convert km to map meters when rendering circle overlay.
- Recenter: animate map camera to selected coordinate.
- Layers: use native map SDK map-type/layer picker if supported; otherwise remove this control rather than shipping a dead button.
- Confirm: validate coordinate/address/radius, prevent duplicate taps, show loading, persist through the existing service-area/onboarding API contract, surface errors and navigate only after confirmed success.

### Important map asset note
`assets/map/jhansi-map-placeholder.svg` is an illustrative static map used only by the standalone HTML preview. It is NOT a real map, not geographically authoritative, and must not ship as the production map. Replace it with the map provider already used by the app (e.g. existing Google Maps / React Native Maps integration). Do not use the screenshot or this SVG as a substitute for map tiles, geocoding, GPS, routing or distance calculations. Confirm Google Maps attribution/branding requirements through the actual SDK/provider.

### Included files
- `index.html`, `initial-state.html`: standalone visual prototype.
- `styles.css`, `app.js`: prototype styles and demo interactions.
- `assets/icons/*.svg`: back, search, target, pin, radius, edit, layers, arrow.
- `assets/map/jhansi-map-placeholder.svg`: illustrative preview map only.
- `design-reference/final-approved-service-area.png`: approved final screenshot.
- `VS_Code_Agent_Prompt.txt`: implementation prompt.
- `README.md`: package guide.

### Native implementation instructions
1. Inspect existing service-area screen, map SDK, permissions, location/geocoding services, state management, API contract, onboarding navigation and reusable design components before editing.
2. Reuse the current map provider and app location architecture. Do not add a second map SDK without justification.
3. Do not invent endpoint names, payload fields, permission abstractions, role rules or navigation routes.
4. Keep selected location as coordinates plus formatted address (using the existing model). Do not rely only on address text for map position.
5. Store radius as a numeric kilometre value consistent with backend expectations.
6. Ensure map camera, marker, radius overlay and selected-address card always represent the same selected point.
7. Keep the Confirm CTA fixed and safe-area aware.
8. Provide loading, permission-denied, no-results, geocoding-failure, network-failure and save-failure states.
9. Add accessibility labels and adequate touch targets (prefer 44 dp minimum).
10. Test 360 dp and 390 dp widths, shorter device heights, permission states, map drag, search selection and radius changes.

### Acceptance checklist
- [ ] Header matches the app profile-screen pattern; no logo and no subheader.
- [ ] Search is immediately below header.
- [ ] Map occupies the primary visual area and shows marker + radius.
- [ ] Pick My Current Location button is present and functional.
- [ ] Selected address and Change action remain synchronized with map.
- [ ] 5 / 10 / 15 / 20 km selection works; exactly one active.
- [ ] Radius overlay changes with selected radius.
- [ ] Confirm CTA remains fixed and safe-area aware.
- [ ] Existing API and navigation contracts are reused.
- [ ] Permission, search, geocoding and save error states are handled.
- [ ] No static placeholder map ships in production.
- [ ] Tests pass and no onboarding regression is introduced.

### Agent final report
Report files changed, map SDK reused, permission/geocoding implementation, selected-location state shape, radius units/backend mapping, API and navigation mapping, tests run, and any deviations from the approved screenshot with reasons.
