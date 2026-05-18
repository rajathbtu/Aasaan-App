/**
 * Global application configuration.  Changing `USE_MOCK_API` controls
 * whether the frontend uses local mock implementations or calls the
 * Express backend defined in `aasaan-app-01/backend`.  The `BASE_URL`
 * specifies where the backend is hosted.  When deploying the backend
 * remotely you should update this value accordingly.
 */
export const USE_MOCK_API = false;

import { resolveDevBaseUrl, logDevNetworkDebug } from './utils/network';

// Fallback used when automatic detection via Expo/Metro fails.
// Use `http://localhost:3000` so simulators/emulators work without editing.
// On a physical device, `resolveDevBaseUrl` will detect your machine's LAN IP.
const DEV_FALLBACK = 'http://localhost:3000';
const DEV_PORT = 3000;

const resolvedBaseUrl = __DEV__
  ? resolveDevBaseUrl(DEV_PORT, DEV_FALLBACK)
  : 'https://aasaan-app.onrender.com';

// Log helpful info in development
logDevNetworkDebug({ port: DEV_PORT, fallback: DEV_FALLBACK, resolved: resolvedBaseUrl });

export const BASE_URL = resolvedBaseUrl;
