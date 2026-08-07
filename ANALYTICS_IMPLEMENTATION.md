# Google Analytics (GA4) Implementation Guide (Simplified)

This project uses GA4 with app-only tracking. The backend does not send analytics events.

Client (React Native):
- Keep basic events only: `screen_view`, `app_open`, `login`, `sign_up`, `button_click`.
- Remove advanced/custom events and error tracking from the app.
- Firebase Analytics remains the client SDK used by React Native to send GA4 events.
- Minimal helpers are available: `initializeAnalytics`, `trackScreenView`, `trackLogin`, `trackSignUp`, `trackButtonClick`.

Server (Node.js):
- Backend analytics are disabled. All functions in `backend/src/utils/analytics.ts` are no-ops, and analytics routes return a disabled message.
- Do not rely on server-side tracking; trigger events from the app only.

Build and deploy:
- Frontend: build with Expo/EAS as usual.
- Backend: `npm run build` and deploy (no GA env vars required for analytics).

Validation:
- Use GA4 Realtime to verify `screen_view`, `login`, `sign_up`, and `button_click` events from the app.

Notes:
- In React Native, Firebase Analytics is the supported GA4 client SDK. Replacing it with a standalone GA SDK is not practical without changing app logic.