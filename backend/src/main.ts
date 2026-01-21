// backend/src/main.ts - Application Entry Point

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import Winston from 'winston';

import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { setupWebSocket } from './websocket/socketHandler';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
});

// Logger setup
const logger = Winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: Winston.format.json(),
  transports: [
    new Winston.transports.File({ filename: 'error.log', level: 'error' }),
    new Winston.transports.File({ filename: 'combined.log' }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new Winston.transports.Console()]
      : []),
  ],
});

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Compression middleware
app.use(compression());

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Request logging
app.use(requestLogger);

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', require('./routes/auth.routes').default);
app.use('/api/v1/users', require('./routes/user.routes').default);
app.use('/api/v1/products', require('./routes/product.routes').default);
app.use('/api/v1/customizations', require('./routes/customization.routes').default);
app.use('/api/v1/orders', require('./routes/order.routes').default);
app.use('/api/v1/payments', require('./routes/payment.routes').default);
app.use('/api/v1/messages', require('./routes/chat.routes').default);
app.use('/api/v1/reviews', require('./routes/review.routes').default);
app.use('/api/v1/seller', require('./routes/seller.routes').default);
app.use('/api/v1/admin', require('./routes/admin.routes').default);
app.use('/api/v1/notifications', require('./routes/notification.routes').default);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      status: 404,
    },
  });
});

// Error handling middleware
app.use(errorHandler);

// ============================================
// WEBSOCKET SETUP
// ============================================

setupWebSocket(io);

// ============================================
// DATABASE AND SERVICE INITIALIZATION
// ============================================

const startServer = async () => {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize Redis
    logger.info('Initializing Redis...');
    await initializeRedis();
    logger.info('Redis initialized successfully');

    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Database: ${process.env.DB_NAME}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export { app, httpServer, io };
