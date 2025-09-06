/**
 * Enhanced Backend Analytics Service
 * Integrates Google Analytics 4 via Measurement Protocol
 */

import { Request } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// GA4 Configuration - Add to environment variables
const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const GA4_API_SECRET = process.env.GA4_API_SECRET || 'your_api_secret';
const GA4_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

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
  private async sendToGA4(payload: GA4Payload): Promise<boolean> {
    try {
      if (!GA4_MEASUREMENT_ID.startsWith('G-') || GA4_API_SECRET === 'your_api_secret') {
        console.warn('⚠️  GA4 not configured - events not sent');
        return false;
      }

      const response = await axios.post(GA4_ENDPOINT, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      if (response.status === 204) {
        console.log(`✅ GA4 Event sent: ${payload.events[0].name}`);
        return true;
      }
    } catch (error) {
      console.error('❌ GA4 tracking failed:', error);
    }
    return false;
  }

  /**
   * Track an event (sends to GA4)
   */
  track(userId: string | undefined, event: string, properties: Record<string, any> = {}) {
    // Send to GA4
    this.sendEventToGA4(userId, event, properties);

    // Log for debugging
    console.log(`[ANALYTICS] ${event}:`, properties);
  }

  /**
   * Send single event to GA4
   */
  private async sendEventToGA4(userId: string | undefined, eventName: string, properties: Record<string, any>) {
    const payload: GA4Payload = {
      client_id: this.generateClientId(userId),
      user_id: userId,
      events: [{
        name: eventName,
        parameters: properties
      }]
    };

    await this.sendToGA4(payload);
  }

  /**
   * Track user properties
   */
  identify(user: User) {
    this.track(user.id, 'identify', {
      role: user.role,
      language: user.language,
      plan: user.plan,
    });

    // Send user properties to GA4
    const payload: GA4Payload = {
      client_id: this.generateClientId(user.id),
      user_id: user.id,
      events: [{
        name: 'user_identified',
        parameters: {}
      }],
      user_properties: {
        user_role: { value: user.role || 'unknown' },
        user_language: { value: user.language || 'en' },
        user_plan: { value: user.plan || 'free' },
        registration_date: { value: new Date().toISOString().split('T')[0] },
      }
    };

    this.sendToGA4(payload);
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
  analytics.identify(user);
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

export default analytics;