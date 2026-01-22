import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRoutes } from './modules/auth';
import { usersRoutes } from './modules/users';
import { leadsRoutes } from './modules/leads';
import { adminRoutes } from './modules/admin';
import { errorHandler, notFoundHandler, apiRateLimiter } from './middleware';

export function createApp(): Express {
  const app = express();

  // Basic middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Apply general rate limiting to all routes
  app.use(apiRateLimiter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/', usersRoutes); // /me
  apiRouter.use('/leads', leadsRoutes);
  apiRouter.use('/admin', adminRoutes);

  app.use('/api', apiRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
