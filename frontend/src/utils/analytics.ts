/**
 * Firebase Analytics Implementation for Aasaan App
 * React Native Firebase (v23.x) proper API usage
 */

import { Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';

// Derive app version from app.json to avoid hardcoding
let APP_VERSION = '1.0.0';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const appJson = require('../../app.json');
  APP_VERSION = appJson?.expo?.version || APP_VERSION;
} catch {}

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
let initialized = false;
let collectionEnabled = true; // allow runtime consent toggle

type QueuedEvent =
  | { kind: 'event'; name: string; params?: Record<string, any> }
  | { kind: 'screen'; screenName: string; category?: string }
  | { kind: 'userId'; userId: string }
  | { kind: 'userProps'; props: Record<string, any> };

const queue: QueuedEvent[] = [];
let lastScreenName: string | undefined;
let lastScreenTs = 0;

const trace = (...args: any[]) => {
  if (__DEV__) console.log('[analytics]', ...args);
};

const toSnakeCase = (s: string) => s
  .replace(/([a-z])([A-Z])/g, '$1_$2')
  .replace(/[^a-zA-Z0-9_]/g, '_')
  .toLowerCase();

const sanitizeEventName = (name: string) => toSnakeCase(name).slice(0, 40);
const sanitizeParams = (params: Record<string, any> = {}) => {
  const out: Record<string, any> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const key = toSnakeCase(k).slice(0, 40);
    // GA4 best practice: strings <= 100 chars for custom params
    if (typeof v === 'string') out[key] = v.slice(0, 100);
    else out[key] = v;
  });
  return out;
};

const flushQueue = async () => {
  if (!initialized || !collectionEnabled || !isNative) return;
  while (queue.length) {
    const item = queue.shift()!;
    try {
      if (item.kind === 'event') {
        await analytics().logEvent(item.name, sanitizeParams(item.params));
      } else if (item.kind === 'screen') {
        await analytics().logScreenView({
          screen_name: item.screenName,
          screen_class: item.category || item.screenName,
        });
      } else if (item.kind === 'userId') {
        await analytics().setUserId(item.userId);
      } else if (item.kind === 'userProps') {
        await analytics().setUserProperties(sanitizeParams(item.props));
      }
    } catch (e) {
      // If it fails, break to avoid spinning; remaining events will try next flush
      console.warn('[analytics] flush failed, will retry later:', e);
      break;
    }
  }
};

export const initializeAnalytics = async (): Promise<void> => {
  if (!isNative) return; // no-op on web
  if (initialized) return;
  try {
    await analytics().setAnalyticsCollectionEnabled(collectionEnabled);
    await analytics().setDefaultEventParameters({
      platform: Platform.OS,
      app_version: APP_VERSION,
      environment: __DEV__ ? 'development' : 'production',
    });
    initialized = true;
    console.log('Firebase Analytics initialized');
    await flushQueue();
  } catch (error) {
    console.error('Analytics initialization failed:', error);
  }
};

export const setAnalyticsEnabled = async (enabled: boolean): Promise<void> => {
  collectionEnabled = !!enabled;
  if (!isNative) return;
  try {
    await analytics().setAnalyticsCollectionEnabled(collectionEnabled);
  } catch (e) {
    console.warn('Failed toggling analytics collection:', e);
  }
};

export const setAnalyticsUserId = async (userId: string): Promise<void> => {
  if (!isNative) return;
  try {
    // Queue both to ensure persistence if init not ready
    if (!initialized) queue.push({ kind: 'userId', userId });
    if (!initialized) queue.push({ kind: 'userProps', props: {
      user_id: userId,
      registration_date: new Date().toISOString(),
    }});
    await analytics().setUserId(userId);
    await analytics().setUserProperties({
      user_id: userId,
      registration_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Set user ID failed:', error);
  }
};

export const trackAppOpen = async (): Promise<void> => {
  if (!isNative) return;
  try {
    const name = sanitizeEventName('app_open');
    const params = sanitizeParams({ platform: Platform.OS, timestamp: Date.now() });
    if (!initialized) queue.push({ kind: 'event', name, params });
    await analytics().logEvent(name, params);
    trace('event', name, params);
  } catch (error) {
    console.error('App open tracking failed:', error);
  }
};

export const trackScreenView = async (screenName: string, category?: string): Promise<void> => {
  if (!isNative) return;
  try {
    // De-dupe rapid consecutive screen views for same screen
    const now = Date.now();
    if (lastScreenName === screenName && now - lastScreenTs < 800) return;
    lastScreenName = screenName; lastScreenTs = now;

    const screen_class = category || screenName;
    if (!initialized) queue.push({ kind: 'screen', screenName, category });
    await analytics().logScreenView({ screen_name: screenName, screen_class });
    trace('screen_view', { screen_name: screenName, screen_class });
  } catch (error) {
    console.error('Screen view tracking failed:', error);
  }
};

export const trackCustomEvent = async (eventName: string, parameters?: Record<string, any>): Promise<void> => {
  if (!isNative) return;
  try {
    const name = sanitizeEventName(eventName);
    const params = sanitizeParams({
      ...parameters,
      platform: Platform.OS,
      timestamp: Date.now(),
    });
    if (!initialized) queue.push({ kind: 'event', name, params });
    await analytics().logEvent(name, params);
    trace('event', name, params);
  } catch (error) {
    console.error(`Custom event tracking failed for ${eventName}:`, error);
  }
};

export const trackSignUp = async (method: string = 'mobile', userType?: string): Promise<void> => {
  if (!isNative) return;
  try {
    const name = sanitizeEventName('sign_up');
    await analytics().logEvent(name, {
      method,
      user_type: userType || 'unknown',
      platform: Platform.OS,
    });
    await analytics().logEvent('user_registered', {
      registration_method: method,
      user_type: userType || 'unknown',
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Sign up tracking failed:', error);
  }
};

export const trackLogin = async (method: string = 'mobile'): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent('login', { method, platform: Platform.OS });
  } catch (error) {
    console.error('Login tracking failed:', error);
  }
};

export const trackRoleSelection = async (role: string): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent('select_content', {
      content_type: 'role',
      item_id: role,
    });
  } catch (error) {
    console.error('Role selection tracking failed:', error);
  }
};

export const trackServiceSelection = async (serviceId: string, serviceName: string): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent('select_service', {
      service_id: serviceId,
      service_name: serviceName,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Service selection tracking failed:', error);
  }
};

export const trackWorkRequestCreated = async (serviceId: string, location: string): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent('work_request_created', {
      service_id: serviceId,
      location,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Work request created tracking failed:', error);
  }
};

export const trackServiceProviderOnboarding = async (step: string, data?: Record<string, any>): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent('service_provider_onboarded', {
      onboarding_step: step,
      ...data,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Service provider onboarding tracking failed:', error);
  }
};

export const trackPurchaseStart = async (amount: number, currency: string = 'INR'): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent('begin_checkout', {
      currency,
      value: amount,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Purchase start tracking failed:', error);
  }
};

export const trackPurchaseCompleted = async (
  amount: number,
  currency: string = 'INR',
  transactionId?: string
): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent('purchase', {
      currency,
      value: amount,
      transaction_id: transactionId || `txn_${Date.now()}`,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Purchase completed tracking failed:', error);
  }
};

export const trackError = async (error: any, context: string, userId?: string, severity?: string): Promise<void> => {
  if (!isNative) return;
  try {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    await analytics().logEvent('app_error', {
      error_message: errorMessage.substring(0, 100),
      context: context || 'unknown',
      user_id: userId || 'anonymous',
      severity: severity || 'medium',
      platform: Platform.OS,
    });
  } catch (analyticsError) {
    console.error('Error tracking failed:', analyticsError);
  }
};

export const trackEvent = async (eventName: string, parameters?: Record<string, any>): Promise<void> => {
  if (!isNative) return;
  try {
    await analytics().logEvent(eventName, {
      ...parameters,
      platform: Platform.OS,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(`Event tracking failed for ${eventName}:`, error);
  }
};

export const getAnalyticsInstanceId = async (): Promise<string | null> => {
  if (!isNative) return null;
  try {
    const id = await analytics().getAppInstanceId();
    if (__DEV__) console.log('[analytics] appInstanceId', id);
    return id;
  } catch (e) {
    console.warn('Failed to get analytics instance id:', e);
    return null;
  }
};