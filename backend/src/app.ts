import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import requestRoutes from './routes/requestRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { errorHandler } from './middleware/errorHandler';

// Create and configure the Express application.  All middleware and routes are
// registered here.  The exported app is used by the server entry point.
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/work-requests', requestRoutes);
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);

// Catch‑all for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler
app.use(errorHandler);

export default app;