# Aasaan App – React Native and Backend Codebase

This repository contains the full source code for **Aasaan**, a mobile
application that connects people needing everyday services with nearby
professionals. The repo is organized as a full-stack workspace:

* **frontend/** – Expo + React Native application written in TypeScript.
* **backend/** – Express API server written in TypeScript, using Prisma + PostgreSQL.

The backend uses PostgreSQL for persistent storage, while the frontend
resolves the backend host dynamically in development via
`frontend/src/config.ts`.

## Prerequisites

* Node.js >= 18 with npm installed.
* PostgreSQL available locally for development or a managed Postgres URL.
* `expo` is available via `npx expo`.

## Getting Started

1. Copy the backend environment example and configure local secrets:

   ```bash
   cd backend
   cp .env.example .env
   # edit .env and set DATABASE_URL, JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
   ```

2. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:

   ```bash
   cd ../frontend
   npm install
   ```

4. Start the backend locally:

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

## Backend database behavior

The backend persists service data in PostgreSQL through Prisma.

* `backend/prisma/schema.prisma` defines the database models.
* `backend/.env.example` shows required values such as `DATABASE_URL`.
* `backend/package.json` includes:
  * `npm run build` — generates Prisma client and compiles TypeScript
  * `npm run dev` — starts the backend in development mode
  * `npm run migrate` — applies pending Prisma migrations
  * `npm run seed:dummy` — inserts 50+ dummy service categories for testing
* `backend/scripts/start.sh` waits for the database to be available and
  runs migrations before launching the server.

The first time the backend is started, the service endpoint itself
seeds the database with default service categories if none exist.
The `GET /services` endpoint in `backend/src/routes/serviceRoutes.ts`
loads service rows and inserts defaults on an empty database.

## Render deployment

This repo includes a `render.yaml` file at the repository root.
It should configure Render to build and start the backend correctly:

* `buildCommand: "npm install && npm run build"`
* `startCommand: "bash ./scripts/start.sh"`

If Render still shows the old build command
`npm install && npx prisma migrate deploy && npm run build`, that means the
service is still using a dashboard override or an older Render configuration
instead of the repo `render.yaml`.

### Render dashboard troubleshooting

1. Open your Render service dashboard for the backend.
2. Confirm the service is set to use the repository's `render.yaml` file.
3. If the dashboard build/start commands are configured manually, update them to:
   * build: `npm install && npm run build`
   * start: `bash ./scripts/start.sh`
4. Verify the latest commit includes the updated `render.yaml` and `backend/scripts/start.sh`.
5. If Render is still using the old command after pushing, refresh the service settings and redeploy.

Important: Render may continue to use the dashboard command if the repository-level
`render.yaml` is not enabled for the service. In that case, the dashboard override
must be removed or updated.

## Frontend configuration

* `frontend/src/config.ts` resolves the backend URL:
  * development uses `resolveDevBaseUrl(...)`
  * production uses `https://aasaan-app.onrender.com`
* `USE_MOCK_API` controls whether the app uses mock data or the real API.

## Project Structure

```text
aasaan-app/
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
    ├── prisma/            – Prisma schema and migrations
    ├── scripts/           – startup and database scripts
    └── src/
        ├── app.ts         – Express application setup
        ├── server.ts      – Entry point creating the HTTP server
        ├── controllers/   – API controllers handling business logic
        ├── routes/        – API route definitions
        ├── models/        – Data models and Prisma client usage
        ├── utils/         – Helpers (validations, encryption)
        └── middleware/    – Express middleware (auth, error handling)
```

## Notes

* **TypeScript** is used throughout both projects to catch errors early and
  improve code readability.
* **Expo** is used to simplify native development and enable OTA updates.
* The backend now uses **PostgreSQL with Prisma** for persistent storage.
* The `GET /services` route seeds default service categories when the database
  is empty.

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

### Troubleshooting

* Prebuild fails: ensure `app.json` contains the identifiers and permissions and that all assets exist at the paths referenced.
* CocoaPods issues on CI: the workflow runs `npx pod-install ios` on macOS. If a specific Pod fails, pin versions in your `ios/Podfile` after prebuild and commit them.
* Gradle out of memory: add `ORG_GRADLE_OPTS: -Xmx3g` as an env var in the Android job.
