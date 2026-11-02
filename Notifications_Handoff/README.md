# Aasaanly Notifications — Complete Agent Handoff

## Start here
1. Read `NOTIFICATIONS_UI_UX_SPEC.md`.
2. Open `index.html` in a browser for the interactive design.
3. Open `initial-state.html` for the default visual state.
4. Open `empty-state.html` for the empty state.
5. Review `assets/icons/` and the screenshot in `design-references/`.
6. Give `VS_Code_Agent_Prompt.txt` to the VS Code agent.

## Files
- `index.html` — interactive notification screen.
- `initial-state.html` — default state.
- `empty-state.html` — no-notifications preview.
- `styles.css` — all visual tokens and styles.
- `app.js` — demo interactions: filter tabs, mark all read, tap notification and detail sheet.
- `NOTIFICATIONS_UI_UX_SPEC.md` — full design/behaviour/engineering specification.
- `VS_Code_Agent_Prompt.txt` — ready-to-use agent prompt.
- `assets/icons/*.svg` — reusable vector icons.
- `design-references/` — approved visual reference if included.

## Important
HTML is a prototype and design handoff, not production app code. Implement natively in the existing Expo React Native app. Replace demo notifications with API data and map actions to existing routes and endpoints. Preserve the app's Profile/Home theme and current business logic.
