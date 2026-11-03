# Aasaanly — Work Request / Interested Providers Handoff

## Contents
- `approved_final_design.png` — authoritative reference (1024 × 1536).
- `index.html` — standalone visual prototype.
- `styles.css` — measured layout, typography, colors, card styling and proportional canvas.
- `app.js` — canvas scaling, provider search, rating sort prototype and accept-button demo.
- `assets/chimney_hob_service_art.png` — sample service illustration.
- `assets/provider_*_sample.png` — sample provider avatar crops from the design.
- `assets/*.svg` — separate UI icons.
- `IMPLEMENTATION_PROMPT.md` — detailed agent prompt for native React Native integration.

## Preview
Extract the ZIP and open `index.html` in a browser. The prototype uses a 1024 × 1536 canvas and scales to the viewport width.

## Important
The three provider cards and their names/metrics are sample visual content from the approved reference. Production must fetch the actual interested-provider list and use live profile photos, ratings, review counts, completed request counts, membership dates and verification status. The Accept Interest button in this prototype is demonstrative only; connect it to the existing backend mutation and confirmation flow.
