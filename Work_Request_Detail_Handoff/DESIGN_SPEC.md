# Exact screen specification

## Canvas and layout
- Target: 9:16 portrait mobile screen; responsive down to 320 CSS px.
- Main page background: `#F4F7FB` to `#F8FBFD` vertical gradient.
- Content horizontal inset: 12 px on narrow mobile, 22 px on wider screens.
- Top status area: 36 px narrow / 46 px wider.
- Header: 64 px narrow / 82 px wider; deep-green gradient; back, title, share, more.
- Request card: white, 19 px narrow / 28 px wider radius, soft shadow.
- Request location: full-width strip below the summary row.
- Action tiles: four equal columns; Boost, Edit, Share, Close.
- Provider filters: horizontal scroll; All, Highest Rated, Nearest, Fast Response.
- Provider cards: portrait + provider details + actions. On narrow screens, actions move to a separate row below details, aligned to the content column.
- Boost banner: green gradient, rocket at left, copy center, CTA right.

## Color tokens
| Token | Hex |
|---|---|
| Primary green | `#078C4B` |
| Deep green | `#075C36` |
| Bright green | `#00A65A` |
| Mint surface | `#E5F8EF` |
| Ink | `#111827` |
| Secondary text | `#5B6676` |
| Border | `#E4EAF0` |
| Edit tile | `#EAF5FF` |
| Share tile | `#F4EEFF` |
| Close tile | `#FFF0F0` |

## Asset manifest
- `chimney_hob_illustration.svg`: purpose-built vector illustration, category-matched to Chimney / Hob.
- `boost_rocket_illustration.png`: rocket banner artwork cropped from the approved visual reference.
- `provider_amit_sample.png`, `provider_sharma_sample.png`, `provider_ecofix_sample.png`: sample provider portraits cropped from the approved reference; replace with API profile images in production.
- `back.svg`, `share.svg`, `share-green.svg`, `more.svg`, `clock.svg`, `location.svg`, `rocket.svg`, `edit.svg`, `close-request.svg`, `search.svg`, `sort.svg`, `chevron.svg`, `verified.svg`, `star.svg`, `completed.svg`, `calendar.svg`, `check.svg`, `bolt.svg`: standalone UI icons with explicit colors.

## Important production notes
The sample provider records are only for visual preview. The page must use live request and provider data. Do not expose placeholder provider data in production. Connect all actions to existing Aasaanly navigation/API behavior.
