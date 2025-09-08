# Google Analytics (GA4) Implementation Guide (Simplified)

This project uses GA4. Client-side analytics are limited to basic events. Server-side events use the GA4 Measurement Protocol.

Scope for client (React Native):
- Keep basic events only: `screen_view`, `app_open`, `login`, `sign_up`, `button_click`.
- Remove advanced/custom events and error tracking from the app.

Scope for server (Node.js):
- GA4 Measurement Protocol integration is available. Use only when needed.

Frontend setup (React Native):
- Firebase Analytics remains the client SDK used by React Native to send GA4 events.
- The app exposes minimal helpers: `initializeAnalytics`, `trackScreenView`, `trackLogin`, `trackSignUp`, `trackButtonClick`.

Backend setup (Node.js):
- Configure env vars for GA4: `GA4_MEASUREMENT_ID*` and `GA4_API_SECRET*` for your platform(s).
- Use `analytics.track(userId, event, params, platform)` when server events are required.

Build and deploy:
- Frontend: build with Expo/EAS as usual.
- Backend: `npm run build` and deploy. Ensure GA4 env vars are set.

Validation:
- Use GA4 Realtime to verify `screen_view`, `login`, `sign_up`, and `button_click` events.

Notes:
- In React Native, Firebase Analytics is the supported GA4 client SDK. Replacing it with a standalone GA SDK is not practical without changing app logic.