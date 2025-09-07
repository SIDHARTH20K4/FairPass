import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import eventRoutes from './routes/events';
import registrationRoutes from './routes/registrations';
import approveUsersRouter from './routes/approveUsers';
import organizationRoutes from './routes/organizations';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env["PORT"] || 4000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://fairpass.vercel.app',
      'https://www.fairpass.vercel.app',
      'https://fairpass.onrender.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development'
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
    cors_origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000'
  });
});

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({
    message: 'FairPass API',
    version: '1.0.0',
    endpoints: {
      events: '/api/events',
      registrations: '/api/events/:eventId/registrations',
      organizations: '/api/organizations',
      auth: '/api/auth'
    },
    documentation: 'https://github.com/fabiomughilan/FairPass'
  });
});

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api', registrationRoutes);
app.use('/api', approveUsersRouter);
app.use('/api', organizationRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const HOST = process.env['HOST'] || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 FairPass Backend running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🔗 API Base: http://${HOST}:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
});

// Handle server errors
server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});