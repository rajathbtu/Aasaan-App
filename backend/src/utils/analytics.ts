/**
 * Enhanced Backend Analytics Service
 * Integrates Google Analytics 4 via Measurement Protocol
 */

import { Request } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// GA4 Configuration - Support multiple platforms
const GA4_MEASUREMENT_ID_ANDROID = process.env.GA4_MEASUREMENT_ID_ANDROID || process.env.GA4_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const GA4_MEASUREMENT_ID_IOS = process.env.GA4_MEASUREMENT_ID_IOS || process.env.GA4_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const GA4_MEASUREMENT_ID_WEB = process.env.GA4_MEASUREMENT_ID_WEB || process.env.GA4_MEASUREMENT_ID || 'G-XXXXXXXXXX';

const GA4_API_SECRET_ANDROID = process.env.GA4_API_SECRET_ANDROID || process.env.GA4_API_SECRET || 'your_api_secret';
const GA4_API_SECRET_IOS = process.env.GA4_API_SECRET_IOS || process.env.GA4_API_SECRET || 'your_api_secret';
const GA4_API_SECRET_WEB = process.env.GA4_API_SECRET_WEB || process.env.GA4_API_SECRET || 'your_api_secret';

// Helper function to get platform-specific configuration
function getGA4Config(platform: 'android' | 'ios' | 'web' = 'android') {
  switch (platform) {
    case 'ios':
      return {
        measurementId: GA4_MEASUREMENT_ID_IOS,
        apiSecret: GA4_API_SECRET_IOS,
        endpoint: `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID_IOS}&api_secret=${GA4_API_SECRET_IOS}`
      };
    case 'web':
      return {
        measurementId: GA4_MEASUREMENT_ID_WEB,
        apiSecret: GA4_API_SECRET_WEB,
        endpoint: `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID_WEB}&api_secret=${GA4_API_SECRET_WEB}`
      };
    default: // android
      return {
        measurementId: GA4_MEASUREMENT_ID_ANDROID,
        apiSecret: GA4_API_SECRET_ANDROID,
        endpoint: `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID_ANDROID}&api_secret=${GA4_API_SECRET_ANDROID}`
      };
  }
}

interface User {
  id: string;
  role?: string;
  language?: string;
  plan?: string;
}

interface GA4Event {
  name: string;
  parameters: Record<string, any>;
}

interface GA4Payload {
  client_id: string;
  user_id?: string;
  events: GA4Event[];
  user_properties?: Record<string, { value: any }>;
}

/**
 * Enhanced analytics service with GA4 integration
 */
class AnalyticsService {
  constructor() {
    // Service ready for GA4 tracking
  }

  /**
   * Generate client ID for GA4 session tracking
   */
  private generateClientId(userId?: string): string {
    return userId ? `user_${userId}` : uuidv4();
  }

  /**
   * Send event to Google Analytics 4 via Measurement Protocol
   */
  private async sendToGA4(payload: GA4Payload, platform: 'android' | 'ios' | 'web' = 'android'): Promise<boolean> {
    try {
      const config = getGA4Config(platform);
      
      if (!config.measurementId.startsWith('G-') || config.apiSecret === 'your_api_secret') {
        console.warn(`⚠️  GA4 not configured for ${platform} - events not sent`);
        return false;
      }

      const response = await axios.post(config.endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      if (response.status === 204) {
        console.log(`✅ GA4 Event sent to ${platform}: ${payload.events[0].name}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ GA4 tracking failed for ${platform}:`, error);
    }
    return false;
  }

  /**
   * Track an event (sends to GA4)
   */
  track(userId: string | undefined, event: string, properties: Record<string, any> = {}, platform: 'android' | 'ios' | 'web' = 'android') {
    // Send to GA4
    this.sendEventToGA4(userId, event, properties, platform);

    // Log for debugging
    console.log(`[ANALYTICS ${platform.toUpperCase()}] ${event}:`, properties);
  }

  /**
   * Send single event to GA4
   */
  private async sendEventToGA4(userId: string | undefined, eventName: string, properties: Record<string, any>, platform: 'android' | 'ios' | 'web' = 'android') {
    const payload: GA4Payload = {
      client_id: this.generateClientId(userId),
      user_id: userId,
      events: [{
        name: eventName,
        parameters: properties
      }]
    };

    await this.sendToGA4(payload, platform);
  }

  /**
   * Identify a user (sends to GA4 for user properties)
   */
  identify(userId: string | undefined, traits: Record<string, any> = {}, platform: 'android' | 'ios' | 'web' = 'android') {
    if (!userId) return;

    const payload: GA4Payload = {
      client_id: this.generateClientId(userId),
      user_id: userId,
      events: [{
        name: 'identify_user',
        parameters: traits
      }],
      user_properties: traits
    };

    this.sendToGA4(payload, platform);
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

// Helper function to extract user ID from request
function getUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}

// Helper function to extract user agent and IP
function getRequestProperties(req: Request) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    user_agent: req.get('User-Agent'),
    referer: req.get('Referer'),
    platform: 'server',
  };
}

// Essential tracking functions used in the application

/**
 * Authentication Events
 */
export const trackUserRegistration = (req: Request, user: User, method: string) => {
  const userTraits = {
    user_role: user.role,
    user_language: user.language,
    user_id: user.id
  };
  
  analytics.identify(user.id, userTraits);
  analytics.track(user.id, 'sign_up', {
    method,
    user_role: user.role,
    user_language: user.language,
    ...getRequestProperties(req),
  });
};

export const trackUserLogin = (req: Request, userId: string, method: string) => {
  analytics.track(userId, 'login', {
    method,
    ...getRequestProperties(req),
  });
};

/**
 * Custom Events (flexible for any event type)
 */
export const trackCustomEvent = (userId: string | undefined, eventName: string, properties: Record<string, any> = {}) => {
  analytics.track(userId, eventName, properties);
};

/**
 * Error Tracking
 */
export const trackError = (req: Request, error: string, context: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
  analytics.track(getUserId(req), 'app_exception', {
    description: error.substring(0, 150),
    context,
    severity,
    fatal: severity === 'high',
    ...getRequestProperties(req),
  });
};

/**
 * API Usage Events
 */
export const trackAPICall = (req: Request, endpoint: string, method: string, responseTime: number, statusCode: number) => {
  analytics.track(getUserId(req), 'api_call', {
    endpoint,
    method,
    response_time: responseTime,
    status_code: statusCode,
    success: statusCode < 400,
    ...getRequestProperties(req),
  });
};

/**
 * Detect platform from request headers
 */
export const detectPlatform = (req: Request): 'android' | 'ios' | 'web' => {
  const userAgent = (req.headers['user-agent'] || '').toString().toLowerCase();
  const appName = (req.headers['x-app-name'] || '').toString().toLowerCase();
  const platform = (req.headers['x-platform'] || '').toString().toLowerCase();

  // Explicit platform header
  if (platform === 'android' || platform === 'ios' || platform === 'web') {
    return platform as 'android' | 'ios' | 'web';
  }

  // App-specific headers
  if (appName.includes('aasaan-android') || userAgent.includes('android')) {
    return 'android';
  }
  
  if (appName.includes('aasaan-ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios';
  }

  // Default to web for browser requests
  return 'web';
};

// Enhanced tracking functions with auto-platform detection
export const trackWithAutoDetection = (req: Request, userId: string | undefined, event: string, properties: Record<string, any> = {}) => {
  const platform = detectPlatform(req);
  return analytics.track(userId, event, properties, platform);
};

export default analytics;