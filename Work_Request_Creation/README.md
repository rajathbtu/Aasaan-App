# Aasaanly Work Request Creation — Pixel-Matched Handoff

This package is rebuilt directly against `approved_reference_852x1846.png` (852 × 1846 px).

## Included
- `approved_reference_852x1846.png`: exact screenshot supplied by the user.
- `index.html`: pixel-positioned 852px design canvas, proportionally scaled to viewport.
- `styles.css`: measured positions, dimensions, typography, cards, tags, toggle and CTA.
- `app.js`: proportional viewport scaling, live counter, tag selection and prototype validation.
- `assets/hero_illustration_reference.png`: exact hero illustration crop from the approved image.
- `assets/android_status_bar_reference.png`: exact status bar crop from the approved image.
- `assets/*.svg`: separate UI and tag icons.
- `IMPLEMENTATION_PROMPT.md`: agent instructions with measured geometry and production integration requirements.

## Preview
Extract the ZIP and open `index.html`. The design uses a 852 × 1846 canvas and scales proportionally to the browser width.

## Exactness note
The hero illustration and Android status bar are cropped directly from the supplied final screenshot to preserve the exact artwork and icon appearance. Other interface elements are recreated as HTML/CSS with separate SVG icons. The page remains interactive for description input and tag selection. The confirm handler is a prototype placeholder.

## Production
Use the prompt to port this reference into the existing React Native app. Bind service title, tags, location, consent and submission to existing app state and API. Do not hardcode the sample service or location.
