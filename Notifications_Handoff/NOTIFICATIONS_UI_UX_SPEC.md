# Aasaanly Notifications — UI/UX and Engineering Handoff

## Source of truth
The approved notification design is aligned with Aasaanly's existing Profile page design language. Use the supplied reference image in `design-references/` when present and the HTML/CSS prototype as the interactive reference. This is a native-app implementation handoff, not a request to embed a WebView.

## Design system alignment
Reuse the same app-wide tokens and visual language as the Profile and Service Provider Home screens:
- Primary green: `#079B65`
- Dark green: `#087B50`
- Soft green surface: `#E8F8F0`
- Page background: `#F7F9F8`
- Primary text: `#202B28`
- Secondary text: `#77827E`
- White cards with subtle grey-green borders and low elevation
- Rounded icon containers and consistent line-icon stroke weight
- Purple remains reserved for Professional/Pro identity if a future notification needs that brand treatment; do not use purple as the default notification accent.
- Reuse the app's typography, spacing scale, safe-area handling and icon library wherever available. Do not introduce a new font or a separate visual system.

## Screen structure
1. Native Android status bar / safe area.
2. Header row:
   - Circular pale-green back button at left.
   - `Notifications` title.
   - Pale-green `Mark all read` action at right.
3. Category filter tabs:
   - All
   - Work Requests
   - Updates
   - Active tab filled with primary green and white text.
   - Inactive tabs white with subtle border/elevation.
   - Counts in the visual reference represent total notifications in each category (All 5, Work Requests 2, Updates 3 in this demo). If the existing product uses unread counts, preserve the existing backend/product semantics rather than forcing these sample numbers.
4. Time-grouped notification list:
   - Today
   - Earlier
   - Each group title has a small pale-green count pill.
5. Notification cards.
6. Empty state when the selected filter has no matching notifications.

## Notification card anatomy
- White card, rounded 16–18 dp, subtle border/shadow.
- Left icon tile: pale-green rounded square with green line icon.
- Content column:
  - Title (strong, dark charcoal)
  - Description (muted charcoal/grey, natural wrapping)
  - Timestamp row with clock icon for recent notifications or calendar icon for older ones.
- Trailing column:
  - Small green unread dot for unread notifications only.
  - Chevron to indicate tappable navigation.
- Unread card: very subtle pale-green tint/border. Read card: white.
- Preserve full message meaning. Allow descriptions to wrap; avoid ellipsis that hides customer, location, service or acceptance details.
- Icon mapping in the reference:
  - New work request: briefcase
  - Profile verification: shield
  - Professional upgrade: crown
  - Interest accepted: check-circle
  - Generic notification: bell

## Included demo notifications
The prototype contains illustrative data for:
1. New Work near Nai Basti, Panchkuiyan — Rajkumar Gupta — AC service & repair — 2 hrs ago — unread.
2. Profile Verification Reminder — 5 hrs ago.
3. New Work near Manik Chowk, Jhansi — geyser service — 13 d ago.
4. Upgrade to Professional — 15 d ago.
5. Your interest was accepted — Window AC not working properly — 16 d ago.

These are reference/demo values. Replace with live notification data. Do not hardcode the sample user or request data in production.

## Interactions demonstrated in HTML
- Category tabs filter the visible notification list.
- Counts update based on unread items in the demo.
- `Mark all read` clears unread styling and unread indicators.
- Tapping a notification marks it read and opens a detail bottom sheet.
- Bottom sheet closes from close button, backdrop or Got it.
- Empty-state preview is provided as `empty-state.html`.
- Back action is a placeholder; connect it to the app's existing navigation.

## Behaviour and data requirements
- Read/unread status must come from the existing notification API/store.
- Mark all read must call the existing bulk-read mutation/API; update UI optimistically only if current app conventions support it, and roll back on failure.
- Opening an unread notification should mark it read using the existing endpoint and then route to the correct destination.
- Notification tap destination is type-dependent. Work request alerts should open the relevant request; verification alerts should open the profile/Aadhaar verification section; Professional alerts should open the plans screen; interest accepted should open the relevant request/contact flow.
- Do not invent API routes, payload fields, notification types or navigation route names. Inspect current models and map them.
- Handle loading, empty, error, offline and pagination states.
- Keep unread counts synchronized after mark-all, individual open, refresh and pagination.
- Avoid marking a notification read merely because it becomes visible unless that is the existing product behaviour.

## Responsive and accessibility requirements
- Design for common Android widths 360–390 dp.
- Test long titles, long locality names and multi-line descriptions.
- No horizontal overflow; tabs may scroll horizontally if required on the narrowest width.
- Icon-only controls need accessible labels.
- Entire notification card should be tappable with adequate touch target.
- Maintain contrast and Android safe-area/status-bar behaviour.
- Respect system font scaling as far as practical.

## Engineering workflow
1. Inspect existing Notifications screen, notification API/model, read/unread mutation, route mapping, and Profile/Home shared theme tokens.
2. Report current components, data shape and navigation mapping before editing.
3. Reuse shared header, button, icon, typography and card primitives where appropriate.
4. Implement the design natively in the existing Expo React Native app. Do not use a WebView.
5. Keep notification filtering and read state derived from real app state; do not create a second disconnected local data model.
6. Add loading, error, empty and pagination behaviour consistent with the rest of the app.
7. Run lint, type-check and relevant tests.

## Acceptance checklist
- [ ] Screen uses the same green/neutral design tokens as Profile and Home.
- [ ] Header has back, title and Mark all read.
- [ ] All / Work Requests / Updates filters work.
- [ ] Unread count semantics match existing backend/product behaviour.
- [ ] Today / Earlier groups render correctly from timestamps.
- [ ] Notification cards show icon, title, full description, timestamp, unread dot and chevron.
- [ ] Read/unread surfaces are visually distinct but subtle.
- [ ] Mark all read calls the real API and handles failure.
- [ ] Tapping a notification marks it read and opens the correct destination.
- [ ] Empty/loading/error/offline states are covered.
- [ ] 360 dp and 390 dp layouts verified.
- [ ] No API or navigation behaviour was invented or regressed.

## Required agent final report
List changed files, shared components/tokens reused, notification model and API mapping, route mapping for each notification type, read-state behaviour, empty/error/loading/pagination handling, tests and results, and any deviation from the HTML reference with reasons.
