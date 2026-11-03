# Aasaanly — Boost Request Final Handoff

## Package contents
- `approved_final_design.png` — authoritative final design reference (1024 × 1536).
- `index.html` — standalone visual prototype.
- `styles.css` — reference-based positions, sizing, typography, colors, cards and responsive canvas scaling.
- `app.js` — proportional scaling, payment option selection prototype and demo CTA handler.
- `assets/boost_rocket_illustration.png` — exact rocket artwork crop from the approved design.
- `assets/service_ac_thumbnail.png` — sample AC thumbnail crop from the approved design.
- `assets/status_bar_reference.png` — status bar reference crop.
- `assets/*.svg` — individual interface and payment icons.
- `IMPLEMENTATION_PROMPT.md` — full agent prompt for native React Native implementation.

## Preview
Extract the ZIP and open `index.html` in a browser. It uses a 1024 × 1536 design canvas and scales proportionally to the browser width.

## Product behavior to preserve
The summary card shows service, category, request time and the saved request location. The location is read-only. Benefits explain boost value. Payment options are money and credit points. The HTML is a visual prototype only; its Pay button is a placeholder and must be connected to the existing Aasaanly payment flow in production.

## Production integration
Do not hardcode ₹100, balances, points eligibility, request details or payment success. Use existing Aasaanly APIs/configuration and update the CTA based on the selected valid payment method.
