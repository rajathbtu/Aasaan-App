import express from 'express';
import { answer, hangup, fallback, createCall } from '../controllers/plivoController';
import { recordingReady } from '../controllers/plivoRecordingController';

const router = express.Router();
// Voice callbacks are normally application/x-www-form-urlencoded.
router.use(express.urlencoded({ extended: false, limit: '32kb' }));
router.post('/recording-ready', recordingReady);

// Webhooks from Plivo
router.post('/answer', answer);
router.post('/hangup', hangup);
router.post('/stream-status', (_req, res) => {
  // Plivo sends stream lifecycle notifications here. Call cleanup is handled
  // by the WebSocket stop/close events and the hangup webhook.
  res.status(200).send('OK');
});
router.post('/fallback', fallback);

// Outbound call API
router.post('/calls', createCall);

export default router;
