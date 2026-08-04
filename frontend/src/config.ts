/**
 * Global application configuration.  
 */
export const USE_MOCK_API = false;

const PUBLIC_DEV_BASE_URL = 'https://crevice-drank-groggily.ngrok-free.dev';
const PRODUCTION_BASE_URL = 'https://aasaan-backend-3v3u.onrender.com';

const isDevelopment = true;

const resolvedBaseUrl = isDevelopment
  ? PUBLIC_DEV_BASE_URL
  : PRODUCTION_BASE_URL;

// Log helpful info in development
console.log('API Base URL:', resolvedBaseUrl);

export const BASE_URL = resolvedBaseUrl;