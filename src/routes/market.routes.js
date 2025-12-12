import express from 'express';
import {
  getLivePrices,
  getMarketOverview,
  getCoinDetails,
  getHistoricalData,
  searchCoins
} from '../controllers/marketController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/prices', getLivePrices);
router.get('/overview', getMarketOverview);
router.get('/search', searchCoins);
router.get('/coin/:id', getCoinDetails);

// Protected routes (require authentication)
router.get('/historical/:id/:days', authenticate, getHistoricalData);

export default router;