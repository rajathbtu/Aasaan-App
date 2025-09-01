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
// registered here.  The exported app is used by the server entry point.
const app = express();

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://192.168.29.8:19006' : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Enable JSON limit for push payloads

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/work-requests', requestRoutes);
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);
app.use('/services', serviceRoutes);
app.use('/push-tokens', pushTokenRoutes);

// Catch‑all for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler
app.use(errorHandler);

export default app;