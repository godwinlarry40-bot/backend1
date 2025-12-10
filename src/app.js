import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import cryptoRoutes from './routes/cryptoRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// API Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'TradePro API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/crypto', cryptoRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TradePro Backend running on port ${PORT}`);
  console.log(`📡 MongoDB: ${process.env.MONGODB_URI}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
});