/**
 * Firebase Analytics Implementation for Aasaan App
 * Clean v22+ Modular API implementation
 */

import { Platform } from 'react-native';
import { 
  getAnalytics, 
  logEvent, 
  setAnalyticsCollectionEnabled, 
  setDefaultEventParameters,
  setUserId,
  setUserProperties
} from '@react-native-firebase/analytics';
import { getApp } from '@react-native-firebase/app';

let analyticsInstance: any = null;
let isFirebaseReady = false;

/**
 * Initialize Firebase Analytics
 */
export const initializeAnalytics = async (): Promise<void> => {
  try {
    if (isFirebaseReady) return;

    const app = getApp();
    analyticsInstance = getAnalytics(app);
    
    await setAnalyticsCollectionEnabled(analyticsInstance, true);
    await setDefaultEventParameters(analyticsInstance, {
      platform: Platform.OS,
      app_version: '1.0.0',
      environment: __DEV__ ? 'development' : 'production',
    });
    
    isFirebaseReady = true;
    console.log('Firebase Analytics initialized');
  } catch (error) {
    console.error('Analytics initialization failed:', error);
    throw error;
  }
};

/**
 * Get analytics instance
 */
const getAnalyticsInstance = () => {
  if (!analyticsInstance) {
    const app = getApp();
    analyticsInstance = getAnalytics(app);
  }
  return analyticsInstance;
};

/**
 * Set user ID for analytics
 */
export const setAnalyticsUserId = async (userId: string): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await setUserId(analytics, userId);
    await setUserProperties(analytics, {
      user_id: userId,
      registration_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Set user ID failed:', error);
  }
};

/**
 * Track app open
 */
export const trackAppOpen = async (): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'app_open', {
      platform: Platform.OS,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('App open tracking failed:', error);
  }
};

/**
 * Track screen view
 */
export const trackScreenView = async (screenName: string, category?: string): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'screen_view_custom', {
      screen_name: screenName,
      screen_category: category || 'general',
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Screen view tracking failed:', error);
  }
};

/**
 * Track custom event
 */
export const trackCustomEvent = async (eventName: string, parameters?: Record<string, any>): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, eventName, {
      ...parameters,
      platform: Platform.OS,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(`Custom event tracking failed for ${eventName}:`, error);
  }
};

/**
 * Track sign up
 */
export const trackSignUp = async (method: string = 'mobile', userType?: string): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'sign_up', {
      method,
      user_type: userType || 'unknown',
      platform: Platform.OS,
    });
    await logEvent(analytics, 'user_registered', {
      registration_method: method,
      user_type: userType || 'unknown',
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Sign up tracking failed:', error);
  }
};

/**
 * Track login
 */
export const trackLogin = async (method: string = 'mobile'): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'login', {
      method,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Login tracking failed:', error);
  }
};

/**
 * Track role selection
 */
export const trackRoleSelection = async (role: string): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'select_content', {
      content_type: 'role',
      item_id: role,
    });
  } catch (error) {
    console.error('Role selection tracking failed:', error);
  }
};

/**
 * Track service selection
 */
export const trackServiceSelection = async (serviceId: string, serviceName: string): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'select_service', {
      service_id: serviceId,
      service_name: serviceName,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Service selection tracking failed:', error);
  }
};

/**
 * Track work request created
 */
export const trackWorkRequestCreated = async (serviceId: string, location: string): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'work_request_created', {
      service_id: serviceId,
      location,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Work request created tracking failed:', error);
  }
};

/**
 * Track service provider onboarding
 */
export const trackServiceProviderOnboarding = async (step: string, data?: Record<string, any>): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'service_provider_onboarded', {
      onboarding_step: step,
      ...data,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Service provider onboarding tracking failed:', error);
  }
};

/**
 * Track purchase start
 */
export const trackPurchaseStart = async (amount: number, currency: string = 'INR'): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'begin_checkout', {
      currency,
      value: amount,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Purchase start tracking failed:', error);
  }
};

/**
 * Track purchase completed
 */
export const trackPurchaseCompleted = async (
  amount: number, 
  currency: string = 'INR', 
  transactionId?: string
): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, 'purchase', {
      currency,
      value: amount,
      transaction_id: transactionId || `txn_${Date.now()}`,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Purchase completed tracking failed:', error);
  }
};

/**
 * Track error
 */
export const trackError = async (error: any, context: string, userId?: string, severity?: string): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    await logEvent(analytics, 'app_error', {
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

/**
 * Generic track event function
 */
export const trackEvent = async (eventName: string, parameters?: Record<string, any>): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    await logEvent(analytics, eventName, {
      ...parameters,
      platform: Platform.OS,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(`Event tracking failed for ${eventName}:`, error);
  }
};