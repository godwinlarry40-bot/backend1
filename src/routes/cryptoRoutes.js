import express from 'express';
import axios from 'axios';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get live crypto prices - matches your frontend
router.get('/prices', optionalAuth, async (req, res, next) => {
  try {
    // Using CoinGecko API (free)
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 20,
          page: 1,
          sparkline: false
        }
      }
    );

    const simplifiedData = response.data.map(coin => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      marketCap: coin.market_cap,
      lastUpdated: coin.last_updated
    }));

    res.json({
      success: true,
      data: simplifiedData,
      timestamp: new Date().toISOString(),
      source: 'CoinGecko'
    });
  } catch (error) {
    console.error('Crypto API Error:', error.message);
    
    // Fallback data if API fails
    const fallbackData = [
      { symbol: 'BTC', name: 'Bitcoin', price: 52345.67, change24h: 2.34, marketCap: 1023456789012 },
      { symbol: 'ETH', name: 'Ethereum', price: 2845.23, change24h: -1.23, marketCap: 341234567890 },
      { symbol: 'BNB', name: 'Binance Coin', price: 345.67, change24h: 3.21, marketCap: 52123456789 },
      { symbol: 'XRP', name: 'Ripple', price: 0.5678, change24h: 0.45, marketCap: 30123456789 }
    ];

    res.json({
      success: true,
      data: fallbackData,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      note: 'Using fallback data - external API unavailable'
    });
  }
});

export default router;