import express from 'express';
import { answer, hangup, createCall, createTestCall, getCampaignStatus } from '../controllers/sarvamController';

const router = express.Router();
// Sarvam sends JSON payloads (not form-urlencoded like Plivo)
router.use(express.json({ limit: '32kb' }));
router.use(express.urlencoded({ extended: false, limit: '32kb' }));

router.post('/answer', answer);
router.post('/hangup', hangup);
router.post('/stream-status', (_req, res) => {
  res.status(200).send('OK');
});

// Outbound call API - Uses Sarvam Official REST API (Instant Outbound)
router.post('/calls', createCall);
// Test call endpoint (requires verified numbers via MCP)
router.post('/test-call', createTestCall);
// Get campaign status
router.get('/campaign', getCampaignStatus);

export default router;
