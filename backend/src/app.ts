import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import requestRoutes from './routes/requestRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import serviceRoutes from './routes/serviceRoutes';
import { errorHandler } from './middleware/errorHandler';

// Create and configure the Express application.  All middleware and routes are
// registered here.  The exported app is used by the server entry point.
const app = express();

// Middlewares
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use((req, res, next) => {
  try {
    // Log request & response for debugging
    const bodyPreview = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : '{}';
    console.log(`[REQ] ${req.method} ${req.originalUrl} body=${bodyPreview}`);
  } catch (err) {
    console.log(`[REQ] ${req.method} ${req.originalUrl} body=<unserializable>`);
  }

  res.on('finish', () => {
    console.log(`[RES] ${req.method} ${req.originalUrl} status=${res.statusCode}`);
  });

  next();
});

const allowedOrigins = new Set([
  'https://crevice-drank-groggily.ngrok-free.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.29.8:3000',
  'http://192.168.32.1:3000',
]);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || origin === 'null' || isDevelopment || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());


// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/work-requests', requestRoutes);
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);
app.use('/services', serviceRoutes);

// Catch‑all for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler
app.use(errorHandler);

export default app;