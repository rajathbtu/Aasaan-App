import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authMiddleware';
import { summarizeVoice } from '../controllers/voiceSummaryController';

const router = Router();

const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many voice summaries. Please wait a minute and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Voice → 80-char summary. Authenticated end-users only.
 * The frontend records audio with expo-av, sends base64, and receives
 * { transcript, summary } — the summary is pasted into the title field.
 */
router.use(authenticate);
router.post('/summarize', voiceLimiter, summarizeVoice);

export default router;
