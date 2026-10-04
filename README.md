# Aasaan

A mobile marketplace that connects people who need help with everyday tasks
(**end users**) to nearby service providers (**SPs**) — on-demand help for
domestic work, delivered in seven Indian languages.

The app ships as an Expo/React Native client backed by an Express + PostgreSQL
API, with a web build published to GitHub Pages and Android/iOS binaries
produced on every push.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Command Reference](#command-reference)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Localization](#localization)
- [Security Notice](#security-notice)
- [Troubleshooting](#troubleshooting)

---

## Features

### For end users

- **Role-based onboarding** — sign in as an end user or a service provider
- **OTP authentication** — mobile number verification, with optional Truecaller
  one-tap login
- **Work requests** — pick a service, add location and tags, then broadcast to
  nearby providers
- **Request boosting** — pay to raise a request's visibility
- **Live tracking** — map view of provider and request location
- **Ratings & reviews** — rate a provider after a job completes
- **Payments** — Razorpay checkout, in-app and on web
- **Push notifications** — Expo push notifications for request lifecycle events
- **Pro subscription** — credit-based plans for premium placement

### For service providers

- **Onboarding flow** — select services, set service radius, confirm location
- **Nearby job feed** — requests filtered by service and distance
- **Accept / close requests** — manage the full job lifecycle
- **Earnings and payouts** — track completed work and payments
- **Pro subscription** — unlock higher visibility and more requests

### Platform

- **Android + iOS + Web** from a single Expo codebase
- **Seven languages** — English, Hindi, Gujarati, Marathi, Tamil, Telugu, Kannada
- **AI voice calling** — Sarvam voice agents for outbound and realtime calls
- **WhatsApp integration** — Meta Cloud API inbound webhooks
- **Offline-tolerant UI** — cached data and graceful empty/error states
- **Automated CI/CD** — APKs, AAB, and iOS simulator builds on every push

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile / Web client** | Expo SDK 54, React Native 0.81.5, React 19.1, TypeScript |
| **Navigation** | React Navigation 7 (native stack + bottom tabs) |
| **State** | React Context (`AuthContext`, `ToastContext`, `NotificationCountContext`) |
| **Maps & location** | `react-native-maps`, `expo-location`, Google Places API |
| **Payments** | Razorpay (`react-native-razorpay`, web checkout) |
| **Notifications** | Expo Notifications + Firebase (FCM) |
| **Backend** | Node.js 22, Express 4.21, TypeScript |
| **Database** | PostgreSQL 14 via Prisma ORM 6.14 |
| **Realtime** | `ws` WebSocket server |
| **Voice AI** | Sarvam STT/TTS + voice agents |
| **Messaging** | WhatsApp Cloud API (Meta) |
| **Deployment** | Render (API + Postgres), GitHub Pages (web), GitHub Actions (builds) |
| **i18n** | `i18n-js` |

---

## Architecture

```
+-----------------------------+
|  Expo app (Android/iOS/Web) |
|  React Navigation + Context |
+--------------+--------------+
               |  HTTPS / REST  +  WebSocket
               v
+-----------------------------+
|     Express API (Node 22)   |
| routes -> controllers -> prisma
+------+-----------+---------+
       |           |
       v           v
+------------+  +------------------------+
| PostgreSQL |  | Sarvam / WhatsApp /    |
|  (Prisma)  |  | Razorpay / SMS / Push  |
+------------+  +------------------------+
```

The client never calls sensitive third-party APIs directly — payments, voice,
and messaging are proxied through the backend so secrets stay server-side. The
one exception is Google Places: native apps call it directly, while web routes
through `/google-places` as a CORS proxy.

---

## Project Structure

```text
aasaan-app/
+-- frontend/                      # Expo / React Native app (the main client)
|   |-- App.tsx                    # Root component, navigation + providers
|   |-- app.json                   # Expo config (name, slug, plugins, perms)
|   |-- app.config.js              # Wraps app.json, injects Google Maps key
|   |-- eas.json                   # EAS build profiles
|   |-- google-services.json       # Firebase config (Android)
|   |-- package-lock.json          # Tracked on purpose - CI needs it
|   `-- src/
|       |-- api/                   # API clients (index.ts, razorpay*.ts)
|       |-- components/            # 23 reusable UI components
|       |-- contexts/              # Auth, Toast, NotificationCount providers
|       |-- data/                  # Static data (services.ts, languages.ts)
|       |-- i18n/                  # i18n-js setup + translations
|       |-- navigation/            # Deep-link config (linking.ts)
|       |-- screens/               # 19 screens (EU + SP flows)
|       |-- services/              # LocationManager, Google Places, push
|       |-- tests/                 # Unit tests
|       |-- types/                 # Ambient + module type declarations
|       |-- utils/                 # network, offline cache, payments, time
|       |-- config.ts              # Base URL + public key resolution
|       `-- theme.ts               # Colors, spacing, typography
|
+-- backend/                       # Express REST + WebSocket API
|   |-- prisma/
|   |   |-- schema.prisma          # 10 models
|   |   `-- migrations/            # 16 applied migrations
|   |-- src/
|   |   |-- app.ts                 # Express app, CORS, route mounting
|   |   |-- server.ts              # HTTP entry point (port 3000)
|   |   |-- server-with-ngrok.ts   # Entry point with public tunnel
|   |   |-- controllers/           # 7 controllers (business logic)
|   |   |-- routes/                # 7 route modules
|   |   |-- middleware/            # auth + error handler
|   |   |-- models/                # Legacy in-memory types (see Note)
|   |   |-- scripts/               # sendTestPush.ts
|   |   |-- utils/                 # prisma, razorpay, encryption, i18n, push
|   |   `-- communications/
|   |       |-- sms/               # SMS provider client
|   |       |-- whatsapp/          # Meta Cloud API (inbound webhooks)
|   |       `-- voiceAI/           # Sarvam STT/TTS + voice agents
|   |           |-- providers/     # sarvamAdapter, factory, types
|   |           |-- services/      # sarvamService, outbound calls
|   |           |-- ws/            # /ws/sarvam realtime socket
|   |           |-- controllers/   # sarvamController
|   |           |-- routes/        # sarvamRoutes
|   |           |-- models/        # sarvamCallSessions
|   |           `-- utils/         # ffmpegHelper
|   `-- package.json
|
|-- htmls/                         # Static HTML design mockups (reference only)
|-- .github/workflows/deploy.yml   # CI: web build, Pages deploy, APK/AAB, iOS
|-- render.yaml                    # Render blueprint (API + Postgres)
|-- RAZORPAY_INTEGRATION.md        # Razorpay integration notes
|-- RAZORPAY_SETUP.md              # Razorpay account setup guide
`-- package.json                   # Root workspace (React Native CLI types)
```

> **Note on `backend/src/models/`** — these are legacy in-memory TypeScript
> types. All persistence now runs through Prisma against PostgreSQL. The files
> remain for type definitions and are gradually being replaced.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 20 or 22 (22 recommended) | CI runs on Node 22 |
| **npm** | 10+ | Ships with Node 20+ |
| **PostgreSQL** | 14+ | Required for the backend |
| **Expo Go** | latest | To run on a physical device |
| **Xcode** | 15+ | macOS only, for iOS builds |
| **Android Studio** | — | For Android emulator + SDK 34 |

You do **not** need a global `expo-cli`; the local CLI is used via `npx`.

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/rajathbtu/Aasaan-App.git
cd Aasaan-App

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure the backend

Create `backend/.env`:

```bash
cd backend
```

Minimum required:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/aasaan?schema=public"
PORT=3000
```

Then create the database and apply migrations:

```bash
npm run db:create-tables
```

### 3. Run the backend

```bash
cd backend
npm run dev
```

Expected output:

```text
Aasaan backend is running on http://0.0.0.0:3000
```

It also prints LAN URLs so a physical phone on the same Wi-Fi can reach it.

**To expose the backend publicly** (needed for a real device without LAN access):

```bash
npm run dev:tunnel     # starts an ngrok tunnel, prints the public URL
```

### 4. Run the frontend

In a **second terminal**:

```bash
cd frontend
npm start
```

Then press `a` for Android emulator, `i` for iOS simulator, `w` for web, or
scan the QR code with Expo Go.

**Pointing the app at your backend:**

```bash
# Explicit URL (recommended for a local backend)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.5:3000 npm start

# Or via the ngrok tunnel from step 3
EXPO_PUBLIC_API_BASE_URL=https://xxxx-xxxx.ngrok-free.dev npm start
```

`EXPO_PUBLIC_*` variables are inlined at bundle time, so **restart Expo with a
clean cache** (`npx expo start -c`) after changing them.

### 5. Verify the setup

Launch the app, complete OTP login, and confirm the services list loads from
the backend rather than a cache.

---


## Environment Variables

### Frontend — `frontend/.env`

All frontend variables are prefixed `EXPO_PUBLIC_`, which means they are
**inlined into the JavaScript bundle and are publicly visible**. Never put a
server secret here.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend base URL. Overrides the built-in default. |
| `EXPO_PUBLIC_TRUECALLER_APP_KEY` | Truecaller one-tap OTP verification |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | Places autocomplete + Android Maps key |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key (safe to expose) |

Profile-photo uploads require no ImageKit secret in the frontend bundle.

If `EXPO_PUBLIC_API_BASE_URL` is unset, `src/config.ts` falls back to a
hard-coded dev ngrok URL or the production Render URL.

### Backend — `backend/.env`

```bash
# Core
DATABASE_URL="postgresql://..."      # required
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
PUBLIC_BASE_URL="https://..."        # public API URL (webhooks, links)
PUBLIC_WS_URL="wss://..."            # public WebSocket URL

# Payments
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Voice AI (Sarvam)
SARVAM_API_KEY=...
SARVAM_STT_URL=                       # optional, has a default
SARVAM_TTS_URL=                       # optional, has a default
SARVAM_VOICE=                        # optional
SARVAM_TTS_CODEC=linear16             # optional
SARVAM_TTS_RATE=24000                 # optional

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_APP_SECRET=...              # used for webhook signature verification
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=...

# SMS
SMS_API_KEY=...
SMS_API_URL=...

# ImageKit profile photos
IMAGEKIT_PRIVATE_KEY=...                 # server secret; never expose to Expo
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
PROFILE_IMAGE_MAX_BYTES=           # optional; 

# Moderator user ids for reviewing the photos, review etc
ADMIN_MODERATOR_USER_IDS=...      # comma-separated Aasaan user IDs

# Misc
GOOGLE_PLACES_API_KEY=...            # server-side proxy usage
NGROK_AUTHTOKEN=...                  # for dev:tunnel
ONBOARDING_TOKEN_SECRET=...
SP_ONBOARDING_URL=...
DEBUG=
```

See `backend/src/communications/voiceAI/SARVAM_INTEGRATION.md` for the full
voice-AI variable reference.

ImageKit profile photos upload to a shared folder and are transformed to
100x100 before storage. Photos remain hidden in Aasaan responses until an
allowlisted moderator approves them. ImageKit URLs themselves are public to
anyone who has the URL. The client-side size check is backed by the signed
ImageKit Upload API v2 policy; v2 is currently documented as beta.

---

## Command Reference

### Backend (`cd backend`)

| Command | What it does |
|---|---|
| `npm run dev` | Start with hot reload (`ts-node-dev`) |
| `npm run dev:tunnel` | Start with an ngrok public tunnel |
| `npm run build` | `prisma generate` then compile TypeScript to `dist/` |
| `npm start` | Run the compiled server from `dist/` |
| `npm run db:create-tables` | Apply all pending Prisma migrations |
| `npm run push:send-test` | Send a test push notification |
| `npm run whatsapp:send-test` | Send a test WhatsApp message |

### Frontend (`cd frontend`)

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Build and launch on an Android device/emulator |
| `npm run ios` | Build and launch on an iOS simulator |
| `npm run web` | Run in the browser |

### Useful Expo / build commands

```bash
# Clean the bundler cache (needed after changing .env)
npx expo start -c

# Generate the native projects, then build locally
npx expo prebuild --platform android
npx expo prebuild --platform ios
cd android && ./gradlew assembleDebug
cd android && ./gradlew assembleRelease
cd android && ./gradlew bundleRelease

# Export the web build (same command CI runs)
npx expo export --platform web

# EAS builds
npx eas-cli build --profile development --platform android
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

### Prisma

```bash
cd backend
npx prisma studio              # browse data in a GUI
npx prisma migrate dev         # create + apply a new migration
npx prisma migrate deploy      # apply migrations (production)
npx prisma generate            # regenerate the client
npx prisma db seed             # seed services
```

---


## API Reference

Base URL: `http://localhost:3000` in development.

Authenticated routes expect an `Authorization: Bearer <token>` header.

### Auth — `/auth`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/send-otp` | Send an OTP to a mobile number |
| `POST` | `/auth/verify-otp` | Verify the OTP and receive a token |
| `POST` | `/auth/register` | Complete registration for a verified number |
| `POST` | `/auth/check-registration` | Check whether a number is already registered |
| `POST` | `/auth/complete-onboarding` | Finish role/service selection |
| `POST` | `/auth/truecaller/start` | Begin a Truecaller one-tap flow |
| `POST` | `/auth/truecaller/callback` | Truecaller callback |
| `GET` | `/auth/truecaller/status/:requestId` | Poll Truecaller status |

### Users — `/users`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/users/me` | Current user profile |
| `PUT` | `/users/me` | Update profile |
| `POST` | `/users/me/push-token` | Register an FCM push token |
| `DELETE` | `/users/me/push-token` | Remove the push token |

### Work requests — `/work-requests`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/work-requests/` | Create a request |
| `GET` | `/work-requests/` | List requests (role-aware) |
| `GET` | `/work-requests/:id` | Request detail |
| `PUT` | `/work-requests/:id/accept` | SP accepts a request |
| `PUT` | `/work-requests/:id/close` | Close a completed request |

### Payments — `/payments`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/payments/create-boost-order` | Razorpay order for a request boost |
| `POST` | `/payments/verify-boost-payment` | Verify a boost payment |
| `POST` | `/payments/boost` | Apply the boost |
| `POST` | `/payments/create-subscription-order` | Razorpay order for a Pro plan |
| `POST` | `/payments/verify-subscription-payment` | Verify a subscription payment |
| `POST` | `/payments/subscribe` | Activate the subscription |

### Notifications — `/notifications`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/notifications/` | List notifications |
| `PUT` | `/notifications/:id/read` | Mark one as read |
| `PUT` | `/notifications/mark-all-read` | Mark all as read |

### Services — `/services`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/services/` | List available services |

### Google Places proxy — `/google-places` (web only)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/google-places/autocomplete` | Place autocomplete |
| `GET` | `/google-places/details` | Place details |
| `GET` | `/google-places/geocode` | Reverse geocoding |

### WhatsApp — `/whatsapp`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/whatsapp/webhook` | Meta webhook verification handshake |
| `POST` | `/whatsapp/webhook` | Inbound message events |
| `GET` | `/whatsapp/status` | Delivery status |

### Sarvam voice AI — `/api/sarvam` and `/webhooks/sarvam`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/sarvam/calls` | Start an outbound voice call |
| `POST` | `/api/sarvam/test-call` | Place a test call |
| `GET` | `/api/sarvam/campaign` | Campaign status |
| `POST` | `/webhooks/sarvam/answer` | Provider answer webhook |
| `POST` | `/webhooks/sarvam/hangup` | Provider hangup webhook |
| `POST` | `/webhooks/sarvam/stream-status` | Stream status webhook |
| `WS` | `/ws/sarvam` | Realtime audio WebSocket |

---


## Database Schema

Defined in `backend/prisma/schema.prisma` (PostgreSQL).

| Model | Purpose | Key fields |
|---|---|---|
| **User** | End user or SP account | `phoneNumber` (unique), `name`, `language`, `role`, `creditPoints`, `picUrl`, `pushToken` |
| **ServiceProviderInfo** | SP profile extension | `services[]`, `radius`, `locationId` |
| **Location** | Saved coordinates | `name`, `lat`, `lng` |
| **WorkRequest** | A job posted by a user | `service`, `locationName/Lat/Lng`, `tags[]`, `boosted`, `closedAt` |
| **AcceptedProvider** | Which SP took a request | `providerId`, `workRequestId`, `acceptedAt` |
| **Rating** | Post-job review | `stars`, `review`, `workRequestId` (unique) |
| **Notification** | In-app notification | `title`, `message`, `read`, `data` (JSON) |
| **Service** | Service catalog | `id`, `name`, `category`, `alias[]`, `tags[]` |
| **Payment** | Transaction record | Razorpay order/payment IDs, amount, status |
| **VoiceCallRecord** | Sarvam call audit trail | call session, status, timestamps |

---

## CI/CD

Workflow: `.github/workflows/deploy.yml` — runs on **every push and PR**.

| Job | When it runs | Output |
|---|---|---|
| `web-build` | Any branch except `main` / `latest-main` | `web-dist` artifact (validates only) |
| `web-deploy` | `main` / `latest-main` only | Publishes to GitHub Pages (`m.aasaanapp.in`) |
| `android` | Always | `android-debug-apk`, `android-apk`, `android-aab` |
| `ios-simulator` | Always | `ios-simulator-app` (unsigned `.app`) |

Exactly one web job runs per branch, so a feature branch can never overwrite
production.

> **The lockfile is required by CI.** All jobs use `setup-node` with
> `cache: npm` and `cache-dependency-path: frontend/package-lock.json`. If that
> file is missing from the repository, the workflow fails immediately at the
> Setup Node step with *"Some specified paths were not resolved"*. Do not add
> `frontend/package-lock.json` to `.gitignore`.

Download artifacts from the run's **Artifacts** section on the Actions page.

### Reproducing CI steps locally

```bash
cd frontend
npx expo export --platform web                                    # web build
npx expo prebuild --platform android && (cd android && ./gradlew assembleDebug)
npx expo prebuild --platform ios                                 # then open ios/ in Xcode
```

---

## Deployment

| Component | Platform | Config |
|---|---|---|
| **Backend API** | Render (free tier, Singapore) | `render.yaml` |
| **Database** | Render PostgreSQL 14 (free) | `render.yaml` |
| **Web app** | GitHub Pages | `m.aasaanapp.in` via the `web-deploy` job |
| **Mobile** | Play Store / App Store | EAS profiles in `eas.json` |

Render applies migrations automatically on boot:

```yaml
startCommand: "npx prisma migrate deploy && npm start"
```

### EAS build profiles

| Profile | Distribution | Use |
|---|---|---|
| `development` | Internal, dev client | Day-to-day testing on a device |
| `preview` | Internal APK | Sharing builds with the team |
| `production` | Store | Play Store / App Store submission |

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli submit --profile production --platform android
```

### Store submission notes

- Google Play requires the **`.aab`** artifact, not an APK.
- The unsigned release APK is **not** installable — use `android-debug-apk` for
  device testing, or sign the release build via Play Console.
- App Store builds require a valid Apple Developer account and signing.

---


## Localization

Seven languages ship in `frontend/src/data/languages.ts` and
`frontend/src/i18n/translations.ts`:

| Code | Language | Native |
|---|---|---|
| `en` | English | English |
| `hi` | Hindi | हिन्दी |
| `gu` | Gujarati | ગુજરાતી |
| `mr` | Marathi | मराठी |
| `ta` | Tamil | தமிழ் |
| `te` | Telugu | తెలుగు |
| `kn` | Kannada | ಕನ್ನಡ |

The backend also has locale-aware message helpers in
`backend/src/utils/i18n.ts`, and the user's language is stored on the `User`
record.

---

## Security Notice

> **`frontend/.env` is currently tracked in git and contains live credentials**
> (Razorpay key, Truecaller app key, Google Places API key) on a **public**
> repository. These are already exposed in git history.
>
> **Deleting the file does not remove it from history.** The keys must be
> **rotated at the provider**, then the file untracked and replaced with a
> committed `frontend/.env.example` containing empty values.
>
> Only `EXPO_PUBLIC_*` variables belong in the frontend bundle. Every secret —
> Razorpay secret keys, Sarvam keys, WhatsApp tokens, database credentials —
> belongs exclusively in `backend/.env`, which is gitignored.

---

## Troubleshooting

**Backend fails to start**
- Confirm `DATABASE_URL` is set and PostgreSQL is reachable.
- Run `npm run db:create-tables` to apply migrations.
- Confirm `npx prisma generate` has produced a client.

**App cannot reach the backend**
- Use your machine's LAN IP, not `localhost` — on a phone, `localhost` means
  the phone itself.
- `EXPO_PUBLIC_*` vars are inlined at build time. Restart with
  `npx expo start -c` after changing them.
- Use `npm run dev:tunnel` for a public URL.

**OTP not arriving**
- Confirm `SMS_API_KEY` / `SMS_API_URL` are set.
- In dev, check the backend console for the generated OTP.

**CI fails at "Setup Node.js"**
- `frontend/package-lock.json` is missing or gitignored. Restore it — see the
  CI/CD note above.

**Gradle out of memory**
- Add `ORG_GRADLE_OPTS: -Xmx3g` to the Android job, or raise runner memory.

**CocoaPods fails in CI**
- The workflow runs `npx pod-install ios`. For a stubborn pod, pin the version
  in the generated `ios/Podfile` after prebuild and commit it.

**Prebuild fails**
- Verify `app.json` has `ios.bundleIdentifier`, `android.package`, and the
  required permission strings, and that all referenced assets exist.

**Expo prebuild output seems missing**
- `frontend/.gitignore` ignores `ios/` and `android/` by design; the managed
  workflow regenerates them from `app.json` on every prebuild.

---

## Contributing

1. Branch from `latest-main` — the active integration branch.
2. Keep `frontend/package-lock.json` committed.
3. Run the build locally before opening a PR.
4. Open a PR against `latest-main`.
5. `web-build` validates the web bundle automatically; `android`,
   `ios-simulator`, and `web-deploy` run on merge.

## License

Private repository. All rights reserved.

