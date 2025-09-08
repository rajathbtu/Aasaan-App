/**
 * Backend Analytics: disabled
 * All event tracking is handled in the mobile app.
 * This file keeps the same exported API but performs no-ops.
 */

import { Request } from 'express';

// Types preserved for compatibility
interface User {
  id: string;
  role?: string;
  language?: string;
  plan?: string;
}

// No-op analytics object (for existing imports that call default export)
const analytics = {
  track: (_userId?: string, _event?: string, _properties: Record<string, any> = {}, _platform: 'android' | 'ios' | 'web' = 'android') => {
    // no-op
    return true;
  },
  identify: (_userId?: string, _traits: Record<string, any> = {}, _platform: 'android' | 'ios' | 'web' = 'android') => {
    // no-op
    return true;
  },
};

// Keep function signatures but perform no-ops
export const trackUserRegistration = (_req: Request, _user: User, _method: string) => {};
export const trackUserLogin = (_req: Request, _userId: string, _method: string) => {};
export const trackCustomEvent = (_userId: string | undefined, _eventName: string, _properties: Record<string, any> = {}) => {};
export const trackError = (_req: Request, _error: string, _context: string, _severity: 'low' | 'medium' | 'high' = 'medium') => {};
export const trackAPICall = (_req: Request, _endpoint: string, _method: string, _responseTime: number, _statusCode: number) => {};

// Platform detection retained for compatibility, though unused by no-ops
export const detectPlatform = (_req: Request): 'android' | 'ios' | 'web' => 'web';
export const trackWithAutoDetection = (_req: Request, _userId: string | undefined, _event: string, _properties: Record<string, any> = {}) => {};

export default analytics;