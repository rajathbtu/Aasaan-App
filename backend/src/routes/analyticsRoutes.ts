/**
 * Analytics Routes
 * Handles Google Analytics 4 event tracking endpoints
 */

import express from 'express';
import analytics, { trackCustomEvent, trackWithAutoDetection } from '../utils/analytics';

const router = express.Router();

/**
 * Test endpoint for analytics functionality
 * POST /api/analytics/test
 */
router.post('/test', async (req, res) => {
  try {
    const { event_name, user_id, platform, parameters } = req.body;
    
    console.log('🧪 Testing analytics with:', { event_name, user_id, platform, parameters });
    
    // Test the analytics function
    const result = analytics.track(user_id || 'test_user_123', event_name || 'test_event', {
      test_parameter: 'test_value',
      timestamp: new Date().toISOString(),
      ...parameters
    }, platform as 'android' | 'ios' | 'web' || 'web');
    
    res.json({
      success: true,
      message: 'Analytics test event sent successfully',
      event_name: event_name || 'test_event',
      user_id: user_id || 'test_user_123',
      platform: platform || 'web',
      ga4_response: result
    });
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Analytics test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generic event tracking endpoint
 * POST /api/analytics/track
 */
router.post('/track', async (req, res) => {
  try {
    const { event_name, parameters, user_id, platform } = req.body;
    
    if (!event_name) {
      return res.status(400).json({
        success: false,
        message: 'event_name is required'
      });
    }
    
    const result = analytics.track(user_id || 'anonymous', event_name, parameters || {}, platform as 'android' | 'ios' | 'web' || 'web');
    
    res.json({
      success: true,
      message: 'Event tracked successfully',
      event_name,
      user_id: user_id || 'anonymous',
      platform: platform || 'web'
    });
    
  } catch (error) {
    console.error('❌ Event tracking failed:', error);
    res.status(500).json({
      success: false,
      message: 'Event tracking failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Batch event tracking endpoint
 * POST /api/analytics/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { events, user_id, platform } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'events array is required'
      });
    }
    
    const results = [];
    
    for (const event of events) {
      try {
        const result = analytics.track(user_id || 'anonymous', event.name, event.parameters || {}, platform as 'android' | 'ios' | 'web' || 'web');
        
        results.push({
          event_name: event.name,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          event_name: event.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${events.length} events`,
      results
    });
    
  } catch (error) {
    console.error('❌ Batch event tracking failed:', error);
    res.status(500).json({
      success: false,
      message: 'Batch event tracking failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;