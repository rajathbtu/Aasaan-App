# Aasaanly — My Requests (Active) Final Handoff

## Contents
- `approved_final_design.png` — approved visual reference (1024 × 1536).
- `index.html` — complete browser prototype.
- `styles.css` — pixel-positioned layout and visual styling.
- `app.js` — proportional canvas scaling and basic tab/navigation prototype interactions.
- `assets/ac_service_illustration_reference.png` — service illustration crop from the approved design.
- `assets/*.svg` — separate notification, tabs, profile, location, clock, settings and navigation icons.
- `IMPLEMENTATION_PROMPT.md` — full prompt for native React Native implementation.

## Preview
Extract the ZIP and open `index.html` in a browser. The page uses a 1024 × 1536 canvas and scales proportionally to the viewport width.

## Important product behavior
The request card intentionally excludes customer name, Call, I'm Interested and editable location controls. It shows only service details, status, created time and the saved request location as read-only text.

The HTML is a visual prototype. Connect the native implementation to the existing Aasaanly APIs, navigation, request status model and dynamic service images. The AC thumbnail is only a sample asset.
