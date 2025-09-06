/**
 * Complete Google Analytics 4 Implementation for Aasaan App
 * Firebase Analytics integration for React Native
 */

import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';

/**
 * Initialize Google Analytics and set user properties
 */
export const initializeAnalytics = async () => {
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    console.log('🔥 Google Analytics 4 initialized via Firebase');
    
    // Set app-level properties
    await analytics().setDefaultEventParameters({
      app_version: '1.0.0',
      platform: Platform.OS,
      environment: __DEV__ ? 'development' : 'production',
    });
  } catch (error) {
    console.error('Analytics initialization failed:', error);
  }
};

/**
 * Set user properties for segmentation and personalization
 */
export const identifyUser = async (userId: string, properties: {
  role: 'endUser' | 'serviceProvider';
  language: string;
  plan: 'free' | 'basic' | 'pro';
  registrationDate: string;
  city?: string;
}) => {
  try {
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

export const trackAppOpen = async (isFirstTime: boolean = false) => {
  try {
    if (isFirstTime) {
      await analytics().logEvent('first_open', {
        platform: Platform.OS,
      });
    } else {
      await analytics().logAppOpen();
    }
  } catch (error) {
    console.error('App open tracking failed:', error);
  }
};

export const trackScreenView = async (screenName: string, screenClass?: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log(`📱 Screen viewed: ${screenName}`);
  } catch (error) {
    console.error('Screen view tracking failed:', error);
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
    if (userId) {
      await crashlytics().setUserId(userId);
    }
    await crashlytics().setAttribute('context', context);
    await crashlytics().setAttribute('severity', severity);
    
    if (severity === 'high') {
      await crashlytics().recordError(error);
    } else {
      await crashlytics().log(`${context}: ${error.message}`);
    }
    
    await analytics().logEvent('app_exception', {
      description: error.message.substring(0, 150),
      fatal: severity === 'high',
      context: context,
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

export const trackCustomEvent = async (eventName: string, parameters: Record<string, any> = {}) => {
  try {
    await analytics().logEvent(eventName, parameters);
  } catch (error) {
    console.error('Custom event tracking failed:', error);
  }
};

export const trackFunnelStep = async (funnelName: string, step: number, stepName: string, completed: boolean) => {
  try {
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