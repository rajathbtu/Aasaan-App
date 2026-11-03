# Aasaanly — Work Request Detail / Interested Providers
## Corrected final implementation prompt

Use `approved_final_design.png` as the authoritative visual reference. The previous handoff had SVGs using `currentColor` loaded as external `<img>` elements; browsers do not inherit CSS `currentColor` into those SVG documents. This handoff fixes that by assigning explicit stroke/fill colors to each SVG. Keep the supplied icon assets intact and use the app's SVG component/registry in React Native.

### Visual direction
- 9:16 portrait mobile screen.
- Deep green gradient top navigation with back, title, share and overflow.
- White request overview card with service illustration, Active pill, request title/category, relative time and mint location strip.
- Four compact pastel action tiles: Boost, Edit, Share, Close.
- Interested Service Providers header with dynamic count.
- Horizontal filters: All, Highest Rated, Nearest, Fast Response.
- Provider cards with circular profile image, name, verified badge, rating/reviews, completed jobs, membership age, response-time pill, Accept Interest and View Profile.
- Dark green boost banner with rocket art and CTA.

### Package files
- `approved_final_design.png`: full reference image (941 x 1672).
- `index.html`: complete static prototype.
- `styles.css`: responsive layout and styles, including narrow-screen breakpoints.
- `app.js`: demo sorting and action handlers.
- `assets/chimney_hob_illustration.svg`: purpose-built vector chimney/hob illustration matching the request category.
- `assets/provider_*_sample.png`: sample profile portraits; replace with real API image URLs.
- `assets/boost_rocket_illustration.png`: boost banner artwork crop.
- `assets/*.svg`: separate icon files with explicit colors, not `currentColor`; includes the chimney/hob service illustration.

### Design tokens
Header gradient: `#075C36` → `#078C4B` → `#00A65A`.
Primary green: `#078C4B`; bright green: `#00A85B`.
Mint: `#E5F8EF`, `#DDF8EC`.
Ink: `#10172B`; secondary: `#596579`; border: `#E2E9EF`.
Edit tile: `#EAF5FF`; share tile: `#F4EEFF`; close tile: `#FFF0F0`.

### Data integration
Do not hardcode demo values in production. Bind request title/category, service image, status, timestamp, location, provider count and provider attributes from existing Aasaanly API responses:
- provider name, avatar, verified flag
- rating, review count
- completed requests
- membership duration
- response-time estimate
Use the existing API service layer and types.

### Functional requirements
- Back/share/more use existing navigation and native share behavior.
- Boost navigates to the boost flow for the current request ID.
- Edit uses the existing request edit route and respects backend editability.
- Close requires confirmation before calling the existing close-request endpoint.
- Filters sort/filter using real data or existing API query parameters.
- Accept Interest uses the correct backend action, handles loading/errors and prevents duplicate taps.
- View Profile navigates to the selected provider.
- Implement loading, empty, error/retry and populated states.
- Empty state should explain that no providers have responded and offer a Boost Request CTA.
- Preserve auth, analytics, permissions and navigation behavior.

### Implementation workflow
1. Inspect current Work Request detail screen, request/provider types, APIs, routes and existing UI components.
2. Reuse app theme, typography, SVG renderer and common components.
3. Implement the new layout without duplicating business logic.
4. Verify on narrow Android devices, 9:16 screens and iOS safe areas.
5. Report files changed, APIs/routes reused, tests run and any deviations.

### Acceptance
- Icons render with correct explicit colors; no broken/missing icons.
- Illustrations retain aspect ratio and do not stretch.
- New layout follows the supplied reference and is responsive.
- Provider filters and actions work with real backend data.
- Demo profiles/images are never treated as real provider data.
