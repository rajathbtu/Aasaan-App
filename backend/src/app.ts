import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import requestRoutes from './routes/requestRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import serviceRoutes from './routes/serviceRoutes';
import googlePlacesRoutes from './routes/googlePlacesRoutes';
import whatsappRoutes from '../whatsapp/routes';
import plivoRoutes from '../voiceAI/routes/plivoRoutes';
import { errorHandler } from './middleware/errorHandler';

// Create and configure the Express application.  All middleware and routes are
// registered here.  The exported app is used by the server entry point.
const app = express();

// Middlewares
const isDevelopment = process.env.NODE_ENV !== 'production';

const allowedOrigins = new Set([
  'https://crevice-drank-groggily.ngrok-free.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.29.8:3000',
  'http://192.168.32.1:3000',
]);

// Origin patterns for Expo dev tooling (web previews served through the
// Expo dev-server tunnel, e.g. https://<id>-<port>.exp.direct).
const allowedOriginPatterns = [/\.exp\.direct$/];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedByPattern = !!origin && allowedOriginPatterns.some((pattern) => pattern.test(origin));
    if (!origin || origin === 'null' || isDevelopment || allowedByPattern || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Capture the exact payload only for Meta's webhook signature verification.
const webhookJsonParser = express.json({
  verify: (req, _res, buf) => {(req as any).rawBody = buf;},
});
app.use('/whatsapp/webhook', (req, res, next) => {
  if (req.method === 'POST') {
    webhookJsonParser(req, res, next);
    return;
  }
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString('en-GB');
  try {
    // Log request & response for debugging
    const isRecordingCallback = /^\/(webhooks\/plivo|api)\/recording-ready\/?$/.test(req.path);
    const bodyPreview = isRecordingCallback ? '<redacted>' :
      req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : '{}';
    console.log(`# # # REQUEST  # # #   ${time} ${req.method} ${req.originalUrl} body=${bodyPreview}`);
  } catch (err) {
    console.log(`# # # REQUEST  # # #   ${time} ${req.method} ${req.originalUrl} body=<unserializable>`);
  }

  res.on('finish', () => {
    console.log(`# # # RESPONSE # # #   ${time} ${req.method} ${req.originalUrl} status=${res.statusCode}`);
  });

  next();
});


// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/work-requests', requestRoutes);
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);
app.use('/services', serviceRoutes);
app.use('/google-places', googlePlacesRoutes); // Web-only proxy for Google Places Web Service endpoints (see googlePlacesProxyController). Native apps call Google directly.
app.use('/whatsapp', whatsappRoutes); // WhatsApp Cloud API (Meta): conversation triggers + webhooks (see backend/whatsapp/README.md)
app.use('/webhooks/plivo', plivoRoutes);
app.use('/api', plivoRoutes); // exposes POST /api/calls

// Catch‑all for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler
app.use(errorHandler);

export default app;