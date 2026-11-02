# Aasaanly Splash Screen — Corrected Final Handoff

## Source of truth
`assets/splash-approved-reference.png` is the exact final visual generated and approved in this conversation. The preview displays this image directly without redrawing, cropping, substituting, or stretching its elements.

## Why this handoff differs from v1
The previous package included approximated SVG wordmark/wave assets and placed the HTML preview inside a nested folder. That could lead to a missing image when opening the wrong `index.html`, and the approximated vectors were not pixel-identical to the approved image. This package removes those misleading approximations and puts a working `index.html` at the package root.

## Visual composition (preserve exactly)
- Pale white / very light mint background.
- Centered lowercase `aasaanly` green wordmark with three mint accent strokes above the final letters.
- Tagline: `Connecting you with local help`, centered in muted slate.
- Short mint curved underline below the tagline.
- Soft mint cityscape: central house, adjacent buildings, trees, shrubs, layered rolling landscape.
- Footer lockup: Indian flag, vertical divider, `Made in India`, mint laurel branches.
- Multiple layered green/mint waves along the bottom edge.
- No floating settings/tools gear, no extra buttons, no loading spinner.

## Brand tokens
- Primary green: `#08B875` (visual estimate from artwork)
- Deep green: `#078B50` (visual estimate)
- Pale mint: `#DDF8EC` (visual estimate)
- Primary text: `#202B29` (visual estimate)
- Secondary slate: `#68717D` (visual estimate)
- Background: `#FBFDFC` (visual estimate)

The approved PNG is authoritative for exact color appearance. Token values are implementation guidance, not a replacement for sampling the approved artwork.

## Files
- `index.html`: root-level preview; opens locally and loads the adjacent `assets` folder.
- `index-standalone.html`: one-file preview with the reference image embedded; use if relative asset paths are broken.
- `assets/splash-approved-reference.png`: exact approved full-screen artwork.
- `assets/brand-lockup-exact.png`: exact raster crop of wordmark and tagline region; extracted, not redrawn.
- `assets/cityscape-illustration-exact.png`: exact raster crop of city/home illustration.
- `assets/made-in-india-footer-exact.png`: exact raster crop of flag/footer lockup.
- `assets/bottom-wave-artwork-exact.png`: exact raster crop of bottom waves.

The cropped components are raster PNGs from the approved reference, not independent editable vector originals. The original vector source for the logo/illustration was not supplied, so do not claim these crops are SVG vectors or recreate them with substitute fonts.

## Production implementation guidance
1. Use the approved full-screen PNG as the visual QA reference.
2. In the app, prefer separately implemented text and official brand vector assets if they exist in the repository; use exact supplied PNG crops for artwork only where the original editable sources are unavailable.
3. Do not stretch any asset. Preserve aspect ratio. For a 9:16 viewport use `contain` or proportional layout; check common device aspect ratios before choosing `cover`.
4. Do not bake a fake status bar into the production UI. The reference image contains a sample status bar at the top; use the native OS status bar and account for its safe-area inset. For production, recreate the content area beneath the native status bar while matching relative spacing from the reference.
5. Do not show the floating developer/tools gear from the original app screenshot.
6. Keep splash duration tied to app initialization; do not add an arbitrary delay.
7. Verify on 360x800, 360x780, 393x873 and 432x960 logical-pixel viewports.

## QA
- Open `index.html` from the extracted package root. It must display the reference.
- If the browser cannot resolve local relative assets, open `index-standalone.html`.
- Compare the app rendering against `assets/splash-approved-reference.png`.
- Confirm logo, tagline, cityscape, footer, and waves are all present and in the same visual order.
