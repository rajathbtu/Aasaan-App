/**
 * Firebase Analytics Implementation for Aasaan App
 * Real Google Analytics 4 tracking with Firebase
 */

import { Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import firebase from '@react-native-firebase/app';

let isFirebaseReady = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize Firebase Analytics with proper error handling and retries
 */
export const initializeAnalytics = async (): Promise<void> => {
  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Create initialization promise
  initializationPromise = (async () => {
    try {
      // Wait for Firebase to be available
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        try {
          // Check if Firebase app is initialized
          const app = firebase.app();
          
          if (app && app.options) {
            // Enable analytics collection
            await analytics().setAnalyticsCollectionEnabled(true);
            
            // Set app-level default parameters
            await analytics().setDefaultEventParameters({
              app_version: '1.0.0',
              platform: Platform.OS,
              environment: __DEV__ ? 'development' : 'production',
            });
            
            isFirebaseReady = true;
            console.log('🔥 Firebase Analytics initialized successfully');
            return;
          }
        } catch (error) {
          // Firebase not ready yet
        }
        
        attempts++;
        console.log(`⏳ Firebase initialization attempt ${attempts}/${maxAttempts}`);
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Final attempt failed
      console.warn('⚠️ Firebase Analytics initialization failed after maximum attempts');
      
    } catch (error) {
      console.error('Firebase Analytics initialization error:', error);
    }
  })();
  
  return initializationPromise;
};

/**
 * Ensure Firebase is ready before executing analytics calls
 */
const ensureFirebaseReady = async (): Promise<boolean> => {
  if (isFirebaseReady) {
    return true;
  }
  
  // Try to initialize if not already done
  await initializeAnalytics();
  return isFirebaseReady;
};

/**
 * Set user properties and ID for analytics
 */
export const identifyUser = async (userId: string, properties: {
  role: 'endUser' | 'serviceProvider';
  language: string;
  plan: 'free' | 'basic' | 'pro';
  registrationDate: string;
  city?: string;
}): Promise<void> => {
  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      console.log('⚠️ Firebase not ready for user identification');
      return;
    }

    await analytics().setUserId(userId);
    await analytics().setUserProperties({
      user_role: properties.role,
      user_language: properties.language,
      user_plan: properties.plan,
      registration_date: properties.registrationDate,
      user_city: properties.city || 'unknown',
    });
    
    console.log(`👤 User identified: ${userId} (${properties.role})`);
  } catch (error) {
    console.error('User identification failed:', error);
  }
};

// ========================================
// 🚀 USER JOURNEY EVENTS
// ========================================

export const trackAppOpen = async (isFirstTime: boolean = false): Promise<void> => {
  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      console.log('⚠️ Firebase not ready for app open tracking');
      return;
    }

    if (isFirstTime) {
      // Use 'app_open' with first_time parameter instead of reserved 'first_open'
      await analytics().logEvent('app_open', {
        first_time: true,
        platform: Platform.OS,
      });
    } else {
      // Use Firebase's built-in app_open event
      await analytics().logEvent('app_open', {
        first_time: false,
        platform: Platform.OS,
      });
    }
    
    console.log(`🚀 App opened: ${isFirstTime ? 'first time' : 'returning'}`);
  } catch (error) {
    console.error('App open tracking failed:', error);
  }
};

export const trackScreenView = async (screenName: string, screenClass?: string): Promise<void> => {
  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      console.log(`⚠️ Firebase not ready for screen: ${screenName}`);
      return;
    }

    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log(`📱 Screen viewed: ${screenName}`);
  } catch (error) {
    console.error(`Screen view tracking failed for ${screenName}:`, error);
  }
};

export const trackSignUp = async (method: 'phone_otp' | 'google' | 'apple', role: 'endUser' | 'serviceProvider') => {
  try {
    await analytics().logSignUp({ method });
    await analytics().logEvent('user_registered', {
      method,
      user_role: role,
    });
    console.log(`✍️ User signed up: ${method} as ${role}`);
  } catch (error) {
    console.error('Sign up tracking failed:', error);
  }
};

export const trackLogin = async (method: 'phone_otp' | 'google' | 'apple') => {
  try {
    await analytics().logLogin({ method });
    console.log(`🔐 User logged in: ${method}`);
  } catch (error) {
    console.error('Login tracking failed:', error);
  }
};

export const trackRoleSelection = async (role: 'endUser' | 'serviceProvider') => {
  try {
    await analytics().logSelectContent({
      content_type: 'role',
      item_id: role,
    });
    console.log(`🎭 Role selected: ${role}`);
  } catch (error) {
    console.error('Role selection tracking failed:', error);
  }
};

// ========================================
// 🛍️ WORK REQUEST JOURNEY
// ========================================

export const trackServiceSelection = async (serviceId: string, serviceName: string) => {
  try {
    await analytics().logEvent('select_service', {
      service_id: serviceId,
      service_name: serviceName,
    });
    console.log(`🔧 Service selected: ${serviceName}`);
  } catch (error) {
    console.error('Service selection tracking failed:', error);
  }
};

export const trackWorkRequestCreated = async (requestId: string, service: string, location: string, tags: string[]) => {
  try {
    await analytics().logPurchase({
      transaction_id: requestId,
      currency: 'INR',
      value: 0,
      items: [{
        item_id: `work_request_${service}`,
        item_name: `Work Request: ${service}`,
        item_category: 'work_request',
        quantity: 1,
      }]
    });
    
    await analytics().logEvent('work_request_created', {
      request_id: requestId,
      service_type: service,
      location_name: location,
      tags_count: tags.length,
    });
    
    console.log(`📋 Work request created: ${requestId}`);
  } catch (error) {
    console.error('Work request creation tracking failed:', error);
  }
};

export const trackWorkRequestClosed = async (requestId: string, hasRating: boolean, stars?: number) => {
  try {
    await analytics().logEvent('work_request_closed', {
      request_id: requestId,
      has_rating: hasRating,
      rating_stars: stars || 0,
    });
    console.log(`✅ Work request closed: ${requestId}`);
  } catch (error) {
    console.error('Work request closure tracking failed:', error);
  }
};

// ========================================
// 🏢 SERVICE PROVIDER EVENTS
// ========================================

export const trackServiceProviderOnboarding = async (services: string[], radius: number) => {
  try {
    await analytics().logJoinGroup({
      group_id: 'service_providers',
    });
    
    await analytics().logEvent('service_provider_onboarded', {
      services_count: services.length,
      service_radius: radius,
    });
    
    console.log(`🏗️ Service provider onboarded: ${services.length} services`);
  } catch (error) {
    console.error('Service provider onboarding tracking failed:', error);
  }
};

export const trackWorkRequestAccepted = async (requestId: string, serviceId: string) => {
  try {
    await analytics().logSelectContent({
      content_type: 'work_request',
      item_id: requestId,
    });
    
    await analytics().logEvent('work_request_accepted', {
      request_id: requestId,
      service_id: serviceId,
    });
    
    console.log(`🤝 Work request accepted: ${requestId}`);
  } catch (error) {
    console.error('Work request acceptance tracking failed:', error);
  }
};

// ========================================
// 💰 PAYMENT EVENTS
// ========================================

export const trackPurchaseStart = async (itemType: 'boost' | 'subscription', value: number) => {
  try {
    await analytics().logBeginCheckout({
      currency: 'INR',
      value: value,
      items: [{
        item_id: itemType,
        item_name: itemType === 'boost' ? 'Work Request Boost' : 'Subscription',
        item_category: itemType,
        price: value,
        quantity: 1,
      }]
    });
  } catch (error) {
    console.error('Purchase start tracking failed:', error);
  }
};

export const trackPurchaseCompleted = async (
  transactionId: string,
  itemType: 'boost' | 'subscription',
  value: number,
  paymentMethod: 'razorpay' | 'credits'
) => {
  try {
    await analytics().logPurchase({
      transaction_id: transactionId,
      currency: 'INR',
      value: value,
      items: [{
        item_id: itemType,
        item_name: itemType === 'boost' ? 'Work Request Boost' : 'Subscription',
        item_category: itemType,
        price: value,
        quantity: 1,
      }]
    });
    
    await analytics().logEvent('payment_completed', {
      transaction_id: transactionId,
      payment_method: paymentMethod,
      item_type: itemType,
      amount: value,
    });
    
    console.log(`💳 Purchase completed: ${itemType} - ₹${value}`);
  } catch (error) {
    console.error('Purchase completion tracking failed:', error);
  }
};

// ========================================
// 🔔 NOTIFICATION EVENTS
// ========================================

export const trackNotificationReceived = async (type: string, title: string) => {
  try {
    await analytics().logEvent('notification_received', {
      notification_type: type,
      notification_title: title.substring(0, 100),
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Notification received tracking failed:', error);
  }
};

export const trackNotificationOpened = async (type: string, title: string) => {
  try {
    await analytics().logEvent('notification_opened', {
      notification_type: type,
      notification_title: title.substring(0, 100),
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Notification opened tracking failed:', error);
  }
};

// ========================================
// ⚡ TECHNICAL EVENTS
// ========================================

export const trackError = async (error: Error, context: string, userId?: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
  try {
    await analytics().logEvent('app_exception', {
      description: error.message.substring(0, 150),
      fatal: severity === 'high',
      context: context,
      user_id: userId,
    });
    
    console.error(`🚨 Error tracked: ${context} - ${error.message}`);
  } catch (trackingError) {
    console.error('Error tracking failed:', trackingError);
  }
};

// ========================================
// 📊 CUSTOM BUSINESS EVENTS
// ========================================

export const trackBusinessMetric = async (metric: string, value: number, dimensions: Record<string, any> = {}) => {
  try {
    await analytics().logEvent('business_metric', {
      metric_name: metric,
      metric_value: value,
      ...dimensions,
    });
  } catch (error) {
    console.error('Business metric tracking failed:', error);
  }
};

export const trackCustomEvent = async (eventName: string, parameters: Record<string, any> = {}): Promise<void> => {
  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      console.log(`⚠️ Firebase not ready for custom event: ${eventName}`);
      return;
    }

    await analytics().logEvent(eventName, parameters);
    console.log(`📊 Custom event tracked: ${eventName}`, parameters);
  } catch (error) {
    console.error(`Custom event tracking failed for ${eventName}:`, error);
  }
};

export const trackFunnelStep = async (funnelName: string, step: number, stepName: string, completed: boolean) => {
  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      console.log('⚠️ Firebase not ready for funnel step tracking');
      return;
    }

    await analytics().logEvent('funnel_step', {
      funnel_name: funnelName,
      step_number: step,
      step_name: stepName,
      step_completed: completed,
    });
  } catch (error) {
    console.error('Funnel step tracking failed:', error);
  }
};

// ========================================
// 🧪 TESTING & DEBUGGING
// ========================================

/**
 * Test if Firebase Analytics is working by sending a test event
 */
export const testFirebaseAnalytics = async (): Promise<boolean> => {
  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      console.error('❌ Firebase Analytics test failed - Firebase not ready');
      return false;
    }

    await analytics().logEvent('test_analytics_connection', {
      test_timestamp: Date.now(),
      platform: Platform.OS,
      environment: __DEV__ ? 'development' : 'production',
    });
    
    console.log('✅ Firebase Analytics test event sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Firebase Analytics test failed:', error);
    return false;
  }
};

// Auto-initialize Firebase Analytics when the module loads
initializeAnalytics().catch(() => {
  // Silently fail - initialization will be retried when functions are called
});