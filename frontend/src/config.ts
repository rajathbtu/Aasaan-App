/**
 * Global application configuration.  
 */
const PUBLIC_DEV_BASE_URL = 'https://crevice-drank-groggily.ngrok-free.dev';
const PRODUCTION_BASE_URL = 'https://aasaan-backend-3v3u.onrender.com';

const isDevelopment = true;

const resolvedBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL
  || (isDevelopment ? PUBLIC_DEV_BASE_URL : PRODUCTION_BASE_URL);

// Log helpful info in development
console.log('API Base URL:', resolvedBaseUrl);

export const BASE_URL = resolvedBaseUrl;
export const TRUECALLER_APP_KEY = process.env.EXPO_PUBLIC_TRUECALLER_APP_KEY || '';
export const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';