# Aasaan App – React Native and Backend Codebase

This repository contains the full source code for **Aasaan**, a mobile
application that connects people needing everyday services with nearby
professionals. The repo is organized as a full-stack workspace:

* **frontend/** – Expo + React Native application written in TypeScript.
* **backend/** – Express API server written in TypeScript, using Prisma + PostgreSQL.

The backend now persists data in PostgreSQL, and the frontend resolves the
backend host dynamically during development using `frontend/src/config.ts`.

## Prerequisites

* Node.js >= 18 with npm installed.
* PostgreSQL accessible locally or remotely.
* `expo-cli` is optional; the repo uses `npx expo`.

## Getting Started

1. Copy the backend environment example and configure local secrets:

   ```bash
   cd backend
   cp .env.example .env
   # edit .env and set DATABASE_URL, JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
   ```

2. Install backend dependencies and deploy Prisma schema:

   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:

   ```bash
   cd ../frontend
   npm install
   ```

4. Start the backend:

   ```bash
   cd ../backend
   npm run dev
   ```

5. Start the frontend in a second terminal:

   ```bash
   cd ../frontend
   npm start
   ```

6. Run the Android app using Expo:

   ```bash
   cd frontend
   npm run android
   ```

## Project Structure

```text
aasaan-app-01/
├── README.md              – High level documentation and setup
├── frontend/              – Expo/React Native application
│   ├── app.json           – Expo configuration
│   ├── package.json       – Frontend dependencies and scripts
│   ├── tsconfig.json      – TypeScript compiler options
│   ├── App.tsx            – Application root
│   └── src/
│       ├── api/           – API clients (mock and real)
│       ├── components/    – Reusable UI components
│       ├── config.ts      – Global configuration (base URL, mock flag)
│       ├── contexts/      – Context providers for state management
│       ├── data/          – Static data (services, tags, languages)
│       ├── i18n/          – Internationalisation setup and translations
│       ├── navigation/    – Navigation configuration (stack and tabs)
│       ├── screens/       – All application screens
│       ├── utils/         – Helpers (validators, analytics, geolocation)
│       └── index.d.ts     – Type declarations for custom modules
└── backend/               – Node/Express server
    ├── package.json       – Backend dependencies and scripts
    ├── tsconfig.json      – TypeScript compiler options
    └── src/
        ├── app.ts         – Express application setup
        ├── server.ts      – Entry point creating the HTTP server
        ├── controllers/   – API controllers handling business logic
        ├── routes/        – API route definitions
        ├── models/        – In‑memory data models
        ├── utils/         – Helpers (validations, encryption)
        └── middleware/    – Express middleware (auth, error handling)
```

## Notes

* **TypeScript** is used throughout both projects to catch errors early and
  improve code readability.  The provided configuration targets modern
  JavaScript and includes source maps for easier debugging.
* **Expo** is used to simplify native development and enable OTA updates.
  When you are ready to publish the app to the App Store or Play Store, you
  can run `expo build` to generate the native binaries.
* The **mock API** mode uses artificial delays to mimic network requests.
  Switching to real API mode will cause the frontend to call the Express
  server running on `localhost` (by default).  See `frontend/src/api/mock.ts`
  for the mock implementation and `frontend/src/api/index.ts` for the real
  implementation.
* Data persistence in the backend is **in memory** for demonstration
  purposes.  All data will reset when the server restarts.  To use a
  persistent database in production you should replace the store in
  `backend/src/models` with an appropriate database layer and update the
  controllers accordingly.

## Mobile CI/CD (GitHub Actions)

This repo ships with a ready‑to‑use workflow that builds Android and iOS artifacts on every push.

- Workflow file: `.github/workflows/build-mobile.yml`
- Outputs (download from the run’s Artifacts section):
  - `android-debug-apk`: Debug APK for sideloading
  - `android-apk`: Release APK
  - `android-aab`: Release App Bundle (for Play Store)
  - `ios-simulator-app`: Zipped iOS Simulator `.app` (no signing required)
  - `ios-ipa`: Signed iOS `.ipa` (only when secrets are configured)

### Requirements

- Expo SDK 53 / React Native 0.79 with prebuild (managed by the workflow).
- `frontend/app.json` must define:
  - `ios.bundleIdentifier`, `ios.buildNumber`
  - `android.package`, `android.versionCode`
  - Any permission usage descriptions (e.g., `NSLocationWhenInUseUsageDescription`).

### iOS .ipa signing (optional)
To generate a distributable `.ipa`, add the following GitHub repository secrets:

- `IOS_CERT_P12_BASE64`: Base64 of your Apple signing certificate `.p12`
- `IOS_CERT_PASSWORD`: Password for that `.p12`
- `IOS_PROVISIONING_PROFILE_BASE64`: Base64 of the `.mobileprovision`
- `IOS_TEAM_ID`: Your Apple Developer Team ID
- `IOS_BUNDLE_IDENTIFIER`: e.g., `com.rajathbtu.aasaan`

If these secrets are not provided, the workflow still builds the iOS Simulator `.app` for testing.

### Local verification

From `frontend/` you can reproduce CI steps:

- Android prebuild: `npx expo prebuild --platform android`
- iOS prebuild: `npx expo prebuild --platform ios`
- Android assemble debug: `(cd android && ./gradlew assembleDebug)`
- Android assemble release: `(cd android && ./gradlew assembleRelease)`
- Android app bundle: `(cd android && ./gradlew bundleRelease)`
- iOS (simulator): open the Xcode workspace in `ios/` and build the `Release` scheme for `Any iOS Simulator Device`.

### Store submission notes

- Google Play requires the `.aab` artifact. Use the uploaded `android-aab` bundle.
- The unsigned Release APK is not installable; use `android-debug-apk` for device tests or sign the release APK/bundle in Play Console.
- App Store submission requires an Apple Developer account and proper signing; you can adapt the workflow to export an `ad-hoc` or `app-store` method in `exportOptions.plist`.

### Troubleshooting

- Prebuild fails: ensure `app.json` contains the identifiers and permissions and that all assets exist at the paths referenced.
- CocoaPods issues on CI: the workflow runs `npx pod-install ios` on macOS. If a specific Pod fails, pin versions in your `ios/Podfile` after prebuild and commit them.
- Gradle out of memory: add `ORG_GRADLE_OPTS: -Xmx3g` as an env var in the Android job.
