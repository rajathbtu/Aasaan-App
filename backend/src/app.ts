import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import requestRoutes from './routes/requestRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import serviceRoutes from './routes/serviceRoutes';
import { errorHandler } from './middleware/errorHandler';
import pushTokenRoutes from './routes/pushTokenRoutes';

// Create and configure the Express application.  All middleware and routes are
// registered here.  The exported app is used by the server entry point
const app = express();

// Middlewares
const corsOptions = {
  origin: process.env.NODE_ENV !== 'production'
    ? true
    : process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : undefined,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Enable JSON limit for push payloads

// Comprehensive API Logging Middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalJson = res.json;
  const originalSend = res.send;

  // Capture response
  res.json = function (data) {
    const duration = Date.now() - startTime;
    console.log(`\n📊 API CALL - ${new Date().toISOString()}`);
    console.log(`├─ Method: ${req.method}`);
    console.log(`├─ Path: ${req.path}`);
    console.log(`├─ Status: ${res.statusCode}`);
    console.log(`├─ Duration: ${duration}ms`);
    console.log(`├─ Request Body: ${JSON.stringify(req.body, null, 2)}`);
    console.log(`├─ Response: ${JSON.stringify(data, null, 2)}`);
    console.log(`└─ IP: ${req.ip}\n`);
    return originalJson.call(this, data);
  };

  res.send = function (data) {
    const duration = Date.now() - startTime;
    console.log(`\n📊 API CALL - ${new Date().toISOString()}`);
    console.log(`├─ Method: ${req.method}`);
    console.log(`├─ Path: ${req.path}`);
    console.log(`├─ Status: ${res.statusCode}`);
    console.log(`├─ Duration: ${duration}ms`);
    console.log(`├─ Request Body: ${JSON.stringify(req.body, null, 2)}`);
    console.log(`├─ Response Type: ${typeof data}`);
    console.log(`└─ IP: ${req.ip}\n`);
    return originalSend.call(this, data);
  };

  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/work-requests', requestRoutes);
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);
app.use('/services', serviceRoutes);
app.use('/push-tokens', pushTokenRoutes);
// Analytics routes removed (backend analytics disabled)

// Catch‑all for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler
app.use(errorHandler);

export default app;