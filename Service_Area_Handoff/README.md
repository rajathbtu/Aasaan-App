# Aasaanly — Confirm Your Service Area handoff

Start with:
1. `design-reference/final-approved-service-area.png` — final approved screen reference.
2. `SERVICE_AREA_UI_UX_SPEC.md` — full design + engineering specification.
3. `index.html` — standalone prototype.
4. `styles.css` and `app.js` — prototype styling and interactions.
5. `VS_Code_Agent_Prompt.txt` — ready-to-paste coding-agent prompt.

Assets:
- `assets/icons/` — SVG icons for back, search, target/current location, selected pin, radius, edit, map layers and CTA arrow.
- `assets/map/jhansi-map-placeholder.svg` — illustrative map for preview only.

Important: implement the screen natively in the existing Expo React Native app. The map SVG is not a real map and must not be used in production. Reuse the app's existing map provider, GPS permission flow, geocoder, API contracts and navigation.
