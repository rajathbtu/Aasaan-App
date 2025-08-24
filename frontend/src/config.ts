/**
 * Global application configuration.  Changing `USE_MOCK_API` controls
 * whether the frontend uses local mock implementations or calls the
 * Express backend defined in `aasaan-app-01/backend`.  The `BASE_URL`
 * specifies where the backend is hosted.  When deploying the backend
 * remotely you should update this value accordingly.
 */
export const USE_MOCK_API = false;

import { resolveDevBaseUrl, logDevNetworkDebug } from './utils/network';

const DEV_FALLBACK = 'http://192.168.1.13:3001'; // optional last-known IP; safe to change or remove
const DEV_PORT = 3001;

const resolvedBaseUrl = __DEV__
  ? resolveDevBaseUrl(DEV_PORT, DEV_FALLBACK)
  : 'https://aasaan-backend.onrender.com';

// Log helpful info in development
logDevNetworkDebug({ port: DEV_PORT, fallback: DEV_FALLBACK, resolved: resolvedBaseUrl });

export const BASE_URL = resolvedBaseUrl;
