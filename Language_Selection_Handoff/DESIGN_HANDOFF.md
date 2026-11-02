# Aasaanly — Language Selection Screen Handoff

## Source of truth
- `assets/language-selection-approved-reference.png` is the approved visual reference supplied by the current design iteration.
- `index.html` + `styles.css` are the responsive HTML/CSS implementation.
- Keep the composition, hierarchy, card order, selection treatment, and sticky CTA aligned with the reference. Do not add a logo or a new centered app header.

## Screen and layout
- Target: portrait mobile, 9:16 class of device; design against 393 × 873 CSS px and support 360–430 px widths.
- The screen is a single scrollable content area. The Continue action is fixed to the bottom safe area.
- Top bar: circular back control at left; current-language pill at right.
- Intro: translation/language illustration, large left-to-right headline treatment centered, muted supporting sentence.
- Language list: single-select cards, native script and English language name, selection control at right.
- CTA: full-width green Continue button in a white sticky footer.

## Interaction
- Exactly one language may be selected.
- Tapping a language card updates its border, pale mint fill, and check state.
- Continue dispatches `aasaanly:language-selected` with `{ language: "en" | "hi" | "gu" | "mr" | "bn" | "ta" }`.
- Replace the demo alert with the existing app navigation and persist the selected locale through the app's existing localization layer.
- Back button must use the app's existing navigation behavior.
- The current-language pill should open the app's language menu if that is part of the existing flow; do not invent a second language-selection state.

## Visual tokens
- Brand green: `#079B60`
- Deep brand green: `#008B52`
- Bright selection green: `#0CBD7B`
- Mint selected surface: `#F0FBF5`
- Mint control surface: `#E9F8F0`
- Primary text: `#17221F`
- Secondary text: `#77818C`
- Border: `#DCE1E6`
- Card radius: 22 px
- Primary CTA radius: 15 px
- Font: Inter (700–800 for headings, 600–700 for labels, 400–500 for supporting text). Use Noto Sans script families for Indian-language glyphs.

## Asset notes
- `assets/language-selection-approved-reference.png`: exact approved rendered reference image.
- The hero illustration in `index.html` is a hand-authored SVG recreation to keep it crisp and editable. It is not an extracted original vector from the generated reference.
- Interface icons are inline SVGs in `index.html`; no icon font dependency.
- Google Fonts are loaded online in this preview. In production, bundle Inter and the Noto Sans language fonts locally or use the app's existing font assets to avoid network dependency.

## Integration guidance
1. Reuse the app's existing navigation, localization, and persistence layers.
2. Do not add a new global header/logo to this screen.
3. Keep the bottom CTA above Android/iOS system navigation using safe-area insets.
4. Test at 360 × 800, 393 × 873, and 430 × 932; verify scrolling does not cover the last language card.
5. Keep the existing language catalog if it contains more languages than this preview; preserve the card component and selected-state styling for the additional rows.
6. Replace demo alert with the real continue action before shipping.

## Files
- `index.html` — standalone page structure
- `styles.css` — design tokens, responsive layout, states
- `app.js` — selection interaction and demo continue event
- `assets/language-selection-approved-reference.png` — approved reference
