// src/app.js

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import apiRoutes from './routes/api.routes.js';
import errorHandler from './middleware/errorHandler.js';

// 1. **CRITICAL FIX: DECLARE AND INITIALIZE app HERE**
const app = express(); 

// 2. Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
   credentials: true
}));

// 3. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// 4. Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Static files
app.use(express.static('public'));

// 6. API routes
app.use('/api', apiRoutes);

// 7. Health check endpoint at root level
app.get('/', (req, res) => {
  res.status(200).json({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  service: 'TradePro Backend API',
    version: '1.0.0'
   });
});

// 8. Global 404 handler - CORRECT FORMAT
app.use((req, res, next) => { // <-- Fixed in previous step
  const error = new Error(`Route ${req.originalUrl} not found on this server`);
  error.status = 404;
  next(error); 
});

// 9. Error handling middleware
app.use(errorHandler);

export default app;