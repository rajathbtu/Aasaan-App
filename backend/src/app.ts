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