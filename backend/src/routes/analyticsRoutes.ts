/**
 * Analytics Routes (disabled)
 * Backend analytics is disabled. Endpoints remain for compatibility
 * and return informative responses without sending any events.
 */

import express from 'express';
import analytics from '../utils/analytics';

const router = express.Router();

// Test endpoint for analytics functionality
router.post('/test', async (_req, res) => {
  res.json({
    success: true,
    message: 'Backend analytics disabled; no events are sent from server.',
  });
});

// Generic event tracking endpoint
router.post('/track', async (_req, res) => {
  res.json({
    success: true,
    message: 'Backend analytics disabled; track from app only.',
  });
});

// Batch event tracking endpoint
router.post('/batch', async (_req, res) => {
  res.json({
    success: true,
    message: 'Backend analytics disabled; batch tracking not processed.',
  });
});

export default router;