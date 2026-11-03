# Aasaanly Consumer Home — Production Implementation Prompt

Implement the approved consumer home screen in the existing Aasaanly Expo React Native app. Use `approved_consumer_home_design.png` as the visual target and `index.html` / `styles.css` as the detailed layout and style specification.

## Inspect first
Inspect the current home screen, navigation, service/category models, API hooks, location selection, notifications, recently used services, bottom tabs, design tokens, typography, icon registry and existing reusable components. Report the integration points before editing. Do not replace live data with hardcoded sample content.

## Required layout
1. Header: Aasaanly wordmark left-aligned. Location selector directly below it, also left-aligned. Notification action on the right. Do not center the logo.
2. Hero: “Get work done with aasaanly”, supporting copy “Trusted professionals, at your service”, and supplied `assets/home_hero_illustration.svg`.
3. Search field below hero, wired to existing service search behavior.
4. Immediately below search, a horizontally scrollable category-chip strip. Include All plus real categories such as Appliance, Home Care, Cleaning, Vehicle where supported by backend data. Selected chip uses mint background and green accent. Selecting a chip filters the service list.
5. Recently Used section with View All and actual recent service data.
6. All Services grouped by real service categories with service cards and existing service icons.
7. Bottom navigation for Create, My Requests, Profile using existing navigation routes.

## Visual system
Follow supplied CSS tokens: primary green #079B60, dark green #07864F, mint #E8F8F0, selected mint #DDF7EA, page #F7FCF9, text #172B2A, secondary #727D89. Use white rounded cards, subtle borders/shadows, generous consistent spacing, rounded category chips, pastel icon bubbles, and clear typography. Reuse these tokens across upcoming consumer pages to establish a common design system.

## Functional requirements
- Preserve location selection, notifications, service search, recent services, category filtering, service selection and bottom-tab behavior.
- Use real API data and existing contracts; do not change backend schemas.
- Combine search and category filters correctly.
- Horizontal category strip must scroll smoothly and show part of the next chip as a scroll affordance.
- Use FlatList/SectionList or existing optimized list components for large datasets.
- Preserve established loading, empty and error states; avoid nested vertical scroll containers and unnecessary rerenders.
- Support small Android/iOS screens, safe areas, accessibility labels and touch targets.

## Engineering constraints
Use native React Native components and existing project conventions. Reuse existing assets/icons and theme tokens. Do not add an unnecessary UI or icon dependency. Do not use the screenshot as a full-screen background. Do not alter unrelated business logic.

## Validate
Test header alignment, location and notification actions, horizontal chip scrolling, category/search combinations, recent service navigation, View All, service card navigation, bottom tabs, loading/empty/error states, safe areas and smaller screens. Run TypeScript, lint and relevant tests.

## Shared reusable patterns
Where appropriate, extract ConsumerHeader, SearchBar, HorizontalCategoryChips, SectionHeader, ServiceCard and shared color/spacing tokens. Avoid premature abstraction; fit the existing architecture.

## Final report
List files changed, APIs/data sources reused, reusable components/tokens created, tests and results, and deviations from the reference.
