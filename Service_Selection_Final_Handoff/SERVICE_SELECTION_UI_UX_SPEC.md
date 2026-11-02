# Aasaanly — Select Services You Offer
## Final UI/UX and engineering handoff

### Design source of truth
`design-reference/final-approved-service-selection.png` is the exact approved screenshot. Treat it as the visual source of truth. Do not redesign, reinterpret, simplify, or rearrange any component. The HTML is a proportional, standard-width mobile prototype of that design.

### Viewport and layout
- Target mobile content width: 390 dp, with responsive support down to 360 dp.
- Never stretch the interface to tablet/desktop width. At wider browser widths, center a phone-width preview.
- App screen uses a vertical layout: status bar, header, search, horizontal category tabs, vertically scrollable service categories, and a fixed bottom selection panel.
- The service content scrolls independently. The selected-services panel remains pinned to the bottom and must not scroll away.
- Respect Android status/navigation bars and safe-area insets in the native implementation.

### Exact visual structure
1. Status bar.
2. Header:
   - Circular pale-green back button on the left.
   - Bold title: `Select Services You Offer`.
   - Subtitle: `Choose one or more services to get relevant work requests.`
3. Search input:
   - Rounded white pill with subtle grey border/shadow.
   - Search icon and placeholder `Search for services...`.
4. Horizontal category tabs:
   - All (selected green pill).
   - Appliance Repair.
   - Beauty & Personal Care.
   - Cleaning.
   - Tabs remain horizontally scrollable on narrow screens.
5. Service sections:
   - Green vertical accent.
   - Category icon and bold category name.
   - Expand/collapse chevron on the right.
6. Service grid:
   - Appliance Repair: 3 columns.
   - Beauty & Personal Care: 4 columns as shown in the approved image.
   - Cleaning: expandable category; content continues below the visible fold.
   - White cards, subtle grey border/shadow, rounded corners.
   - Green outline and pale-green fill for selected services.
   - Green circular check badge at the upper-right of selected cards.
   - Green line icons and centered labels.
7. Fixed selected-services footer:
   - White surface with subtle top border/shadow.
   - Heading showing dynamic count: `3 Services Selected`.
   - `Clear all` action.
   - Selected service chips with individual remove controls.
   - Green Confirm button aligned to the right of the chip row in the standard phone layout.
   - The chip row may scroll horizontally on narrow widths to preserve the layout without stretching the phone or moving the Confirm action.

### Initial demo selection
Preselected exactly as shown:
- AC Service & Repair
- Chimney / Hob
- Geyser Service

The demo service catalogue includes the visible appliance and beauty service labels plus illustrative cleaning items. Replace or reconcile this sample catalogue with the real app service catalogue; do not remove existing production services.

### Visual tokens
- Primary green: `#079B5C`
- Dark green: `#087B49`
- Selected surface: `#EFFBF3`
- Selected chip surface: `#E7F9ED`
- Main text: `#111714`
- Secondary text: `#68716F`
- Borders: `#E4E9E6`
- Background: `#FFFFFF`
- Cards: white, rounded, subtle shadow
- Typography: use the existing Aasaanly app font if one is already configured. Prototype uses system sans-serif. Do not introduce a new font dependency.

### Interaction behaviour in the HTML prototype
- Tap a service tile to select/deselect it.
- Selected tile receives green outline, pale-green fill and check badge.
- Footer count and chips update immediately.
- Tap the x on a chip to remove that service.
- Clear all removes every selected service.
- Confirm displays a demo alert; connect this to the existing save/continue action in the real app.
- Search filters services by label.
- Category tabs filter to All / Appliance Repair / Beauty & Personal Care / Cleaning.
- Category headings expand/collapse their service grid.
- Back button is a placeholder for the app's existing navigation.

### Native implementation requirements
- Implement natively in the existing Expo React Native app. Do not use a WebView.
- First inspect the current service catalogue, selected-service model, API mutations, persistence and navigation.
- Preserve existing service IDs, enum values, backend payload shape, validation and selection limits.
- Do not invent API endpoints, IDs or category values.
- Initialize selection from the existing provider profile data, not the prototype's hardcoded demo values.
- Save/confirm through the existing app flow; handle pending, success and failure states.
- Search and category filters must operate on the actual service catalogue.
- If there is an existing maximum-selection rule, preserve it and communicate validation using the app's existing pattern.
- Maintain accessibility labels and touch targets for service tiles, remove chips, tabs, search, collapse controls and Confirm.
- Test at 360 dp and 390 dp, including long service names, many selected chips, empty search results, expanded/collapsed groups and keyboard visibility.

### Acceptance checklist
- [ ] Layout matches the approved screenshot; no creative redesign.
- [ ] Content stays within 360–390 dp phone width.
- [ ] No horizontal page overflow.
- [ ] Search, tabs, expand/collapse and selection work.
- [ ] Selected styling and check badges match the reference.
- [ ] Selected count and removable chips stay synchronized.
- [ ] Bottom selection panel remains fixed while service catalogue scrolls.
- [ ] Confirm remains visible and uses the existing save flow.
- [ ] Existing backend service IDs and validation are preserved.
- [ ] Loading/error/success states follow existing app patterns.
- [ ] Lint, type-check and relevant tests pass.

### Agent final report
List files changed, existing components/tokens reused, source of service catalogue and IDs, save API/mutation mapping, selection-limit behaviour, test results and any unavoidable deviations from the screenshot.
