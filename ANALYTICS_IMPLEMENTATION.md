# 🔥 Complete Google Analytics 4 + Firebase Implementation Guide

## 📋 Prerequisites & Setup

### STEP 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: "Aasaan Analytics"
3. Enable Google Analytics (GA4 property created automatically)
4. Note your Project ID and Web App Config

### STEP 2: Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics
npx expo install expo-dev-client

# Backend dependencies  
cd ../backend
npm install axios uuid
```

### STEP 3: Download Configuration Files
- Download `google-services.json` → Place in `frontend/android/app/`
- Download `GoogleService-Info.plist` → Place in `frontend/ios/`
- Copy Web App config for backend use

### STEP 4: Configure Environment Variables
Add these to your backend `.env` file:

```bash
# Google Analytics 4 Configuration
GA4_MEASUREMENT_ID=G-XXXXXXXXXX  # Your GA4 Measurement ID (from GA4 property)
GA4_API_SECRET=your_api_secret_here  # Generate from GA4 Admin → Data Streams → Measurement Protocol API secrets
```

To get your API secret:
1. Go to GA4 Admin → Data Streams
2. Click on your app stream
3. Go to "Measurement Protocol API secrets"
4. Click "Create" to generate a new API secret

// STEP 2: Add Firebase configuration files
// Download google-services.json and GoogleService-Info.plist from Firebase Console
// Place them in android/app/ and ios/ directories respectively

// STEP 3: Update app.json to include Firebase plugin
/*
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      [
        "@react-native-firebase/analytics",
        {
          "analyticsCollectionEnabled": true
        }
      ]
    ]
  }
}
*/

// STEP 4: Create Firebase Analytics utility (updated version)
// /frontend/src/utils/firebaseAnalytics.ts

import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

/**
 * Firebase Analytics utility for the Aasaan app
 */

// Initialize analytics
export const initializeAnalytics = async () => {
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    console.log('Firebase Analytics initialized');
  } catch (error) {
    console.error('Failed to initialize Firebase Analytics:', error);
  }
};

// User Events
export const trackUserRegistration = async (method: 'phone_otp' | 'google' | 'apple', role: 'endUser' | 'serviceProvider') => {
  try {
    await analytics().logSignUp({
      method,
      custom_parameters: {
        role,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

export const trackUserLogin = async (method: 'phone_otp' | 'google' | 'apple') => {
  try {
    await analytics().logLogin({
      method,
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

export const setUserProperties = async (userId: string, role: 'endUser' | 'serviceProvider', language: string, plan: string) => {
  try {
    await analytics().setUserId(userId);
    await analytics().setUserProperties({
      role,
      language,
      plan,
      registration_date: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Analytics user properties failed:', error);
  }
};

// Screen tracking
export const trackScreenView = async (screenName: string, screenClass?: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (error) {
    console.error('Screen tracking failed:', error);
  }
};

// Work Request Events
export const trackWorkRequestCreated = async (service: string, location: string, tags: string[]) => {
  try {
    await analytics().logEvent('create_work_request', {
      service,
      location,
      tags_count: tags.length,
      tags: tags.join(','),
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

export const trackWorkRequestBoosted = async (requestId: string, paymentMethod: 'razorpay' | 'credits', amount: number) => {
  try {
    await analytics().logEvent('boost_work_request', {
      request_id: requestId,
      payment_method: paymentMethod,
      value: amount,
      currency: 'INR',
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

// Payment Events
export const trackPurchase = async (transactionId: string, value: number, currency: string, items: any[]) => {
  try {
    await analytics().logPurchase({
      transaction_id: transactionId,
      value,
      currency,
      items,
    });
  } catch (error) {
    console.error('Purchase tracking failed:', error);
  }
};

// Custom Events
export const trackCustomEvent = async (eventName: string, parameters: Record<string, any>) => {
  try {
    await analytics().logEvent(eventName, parameters);
  } catch (error) {
    console.error('Custom event tracking failed:', error);
  }
};

// Error Tracking with Crashlytics
export const trackError = async (error: Error, context: string, userId?: string) => {
  try {
    if (userId) {
      await crashlytics().setUserId(userId);
    }
    
    await crashlytics().setAttribute('context', context);
    await crashlytics().recordError(error);
  } catch (crashError) {
    console.error('Error tracking failed:', crashError);
  }
};

export const trackNonFatalError = async (message: string, context: string, userId?: string) => {
  try {
    if (userId) {
      await crashlytics().setUserId(userId);
    }
    
    await crashlytics().setAttribute('context', context);
    await crashlytics().log(message);
  } catch (error) {
    console.error('Non-fatal error tracking failed:', error);
  }
};

export default {
  initializeAnalytics,
  trackUserRegistration,
  trackUserLogin,
  setUserProperties,
  trackScreenView,
  trackWorkRequestCreated,
  trackWorkRequestBoosted,
  trackPurchase,
  trackCustomEvent,
  trackError,
  trackNonFatalError,
};

// STEP 5: Alternative Mixpanel Implementation
// If you prefer Mixpanel, here's the setup:

/*
// Install: npm install mixpanel-react-native

import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = 'YOUR_MIXPANEL_PROJECT_TOKEN';

class MixpanelAnalytics {
  private mixpanel: Mixpanel;

  constructor() {
    this.mixpanel = new Mixpanel(MIXPANEL_TOKEN);
    this.mixpanel.init();
  }

  track(event: string, properties: Record<string, any> = {}) {
    this.mixpanel.track(event, properties);
  }

  identify(userId: string) {
    this.mixpanel.identify(userId);
  }

  setUserProperties(properties: Record<string, any>) {
    this.mixpanel.getPeople().set(properties);
  }

  alias(newId: string) {
    this.mixpanel.alias(newId);
  }
}

export const mixpanelAnalytics = new MixpanelAnalytics();
*/