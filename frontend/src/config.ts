/**
 * Global application configuration.  Changing `USE_MOCK_API` controls
 * whether the frontend uses local mock implementations or calls the
 * Express backend defined in `aasaan-app-01/backend`.  The `BASE_URL`
 * specifies where the backend is hosted.  When deploying the backend
 * remotely you should update this value accordingly.
 */
export const USE_MOCK_API = false;
export const BASE_URL = process.env.NODE_ENV === 'development' ? 
                    'http://192.168.29.8:3000' : 
                    'https://aasaan-backend.onrender.com';
