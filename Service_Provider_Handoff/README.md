# Aasaanly Provider Home — Final Approved Design Handoff

The final screenshots supplied by the user are included in `design-references/` and are the source of truth. Do not redesign them.

## HTML previews
- `index.html` — interactive full page; scroll down to collapse Professional banner, scroll to top to expand.
- `initial-page.html` — initial page with hero and expanded banner.
- `scrolled-page.html` — scrolled page with hero/location out of view, sticky filters and compact banner.
- `banner-scroll-animation.html` — interactive scroll animation test.
- `banner-expanded.html` — isolated expanded banner.
- `banner-compact.html` — isolated compact banner.
- `styles.css` — shared stylesheet.

## Agent handoff
- `FINAL_UI_UX_SPEC.md` — detailed design and behaviour contract.
- `VS_Code_Agent_Prompt.txt` — ready-to-use VS Code agent prompt.

## Assets
`assets/icons/` contains 20 vector SVG icons. `assets/illustrations/` contains the service toolbox (hero) and air-conditioner (request card) illustrations. `assets/customer-avatar.svg` is the customer avatar placeholder.

Open HTML previews directly in Chrome at 390 px width and also check 360 px. The HTML is a design reference, not a WebView deliverable. Implement natively in the existing Expo React Native application, preserving its current API and business logic.
