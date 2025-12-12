import axios from 'axios';
import logger from '../utils/logger.js';

// CoinGecko API configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY || null;

// Create axios instance with headers
const coingeckoApi = axios.create({
  baseURL: COINGECKO_API_BASE,
  timeout: 10000,
  headers: API_KEY ? {
    'x-cg-pro-api-key': API_KEY
  } : {}
});

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute in milliseconds

/**
 * Get current prices for cryptocurrencies
 * @param {string} ids - Comma-separated list of coin IDs
 * @param {string} vs_currencies - Comma-separated list of target currencies
 * @returns {Promise<Object>} Price data
 */
export const getCryptoPrices = async (ids = 'bitcoin,ethereum', vs_currencies = 'usd') => {
  const cacheKey = `prices_${ids}_${vs_currencies}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug('Returning cached crypto prices');
    return cached.data;
  }
  
  try {
    const response = await coingeckoApi.get('/simple/price', {
      params: {
        ids,
        vs_currencies,
        include_24hr_change: true,
        include_last_updated_at: true
      }
    });
    
    const data = response.data;
    
    // Cache the response
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    logger.debug(`Fetched crypto prices for: ${ids}`);
    return data;
  } catch (error) {
    logger.error('Error fetching crypto prices:', {
      ids,
      vs_currencies,
      error: error.message
    });
    
    // Return fallback data if API fails
    return getFallbackPrices(ids, vs_currencies);
  }
};

/**
 * Get market data for cryptocurrencies
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Market data
 */
export const getMarketData = async (params = {}) => {
  const {
    vs_currency = 'usd',
    order = 'market_cap_desc',
    per_page = 100,
    page = 1,
    sparkline = false
  } = params;
  
  const cacheKey = `market_${vs_currency}_${order}_${per_page}_${page}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug('Returning cached market data');
    return cached.data;
  }
  
  try {
    const response = await coingeckoApi.get('/coins/markets', {
      params: {
        vs_currency,
        order,
        per_page,
        page,
        sparkline,
        price_change_percentage: '1h,24h,7d'
      }
    });
    
    const data = response.data;
    
    // Cache the response
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    logger.debug(`Fetched market data for page ${page}`);
    return data;
  } catch (error) {
    logger.error('Error fetching market data:', {
      params,
      error: error.message
    });
    
    // Return fallback data if API fails
    return getFallbackMarketData(per_page);
  }
};

/**
 * Get historical market data
 * @param {string} id - Coin ID
 * @param {string} vs_currency - Target currency
 * @param {string} days - Number of days
 * @returns {Promise<Array>} Historical data
 */
export const getHistoricalData = async (id = 'bitcoin', vs_currency = 'usd', days = '7') => {
  const cacheKey = `historical_${id}_${vs_currency}_${days}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug('Returning cached historical data');
    return cached.data;
  }
  
  try {
    const response = await coingeckoApi.get(`/coins/${id}/market_chart`, {
      params: {
        vs_currency,
        days,
        interval: days <= 1 ? 'hourly' : 'daily'
      }
    });
    
    const data = response.data;
    
    // Cache the response
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    logger.debug(`Fetched historical data for ${id} (${days} days)`);
    return data;
  } catch (error) {
    logger.error('Error fetching historical data:', {
      id,
      vs_currency,
      days,
      error: error.message
    });
    
    // Return empty data if API fails
    return { prices: [], market_caps: [], total_volumes: [] };
  }
};

/**
 * Get coin information
 * @param {string} id - Coin ID
 * @returns {Promise<Object>} Coin information
 */
export const getCoinInfo = async (id = 'bitcoin') => {
  const cacheKey = `coin_${id}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 10) { // Longer cache for coin info
    logger.debug('Returning cached coin info');
    return cached.data;
  }
  
  try {
    const response = await coingeckoApi.get(`/coins/${id}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      }
    });
    
    const data = response.data;
    
    // Cache the response
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    logger.debug(`Fetched coin info for ${id}`);
    return data;
  } catch (error) {
    logger.error('Error fetching coin info:', {
      id,
      error: error.message
    });
    
    // Return fallback data if API fails
    return getFallbackCoinInfo(id);
  }
};

/**
 * Search for coins
 * @param {string} query - Search query
 * @returns {Promise<Array>} Search results
 */
export const searchCoins = async (query) => {
  if (!query || query.length < 2) {
    return [];
  }
  
  const cacheKey = `search_${query}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 5) {
    logger.debug('Returning cached search results');
    return cached.data;
  }
  
  try {
    const response = await coingeckoApi.get('/search', {
      params: { query }
    });
    
    const data = response.data.coins || [];
    
    // Cache the response
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    logger.debug(`Searched for: ${query} (found ${data.length} results)`);
    return data;
  } catch (error) {
    logger.error('Error searching coins:', {
      query,
      error: error.message
    });
    
    // Return empty array if API fails
    return [];
  }
};

/**
 * Get global market data
 * @returns {Promise<Object>} Global market data
 */
export const getGlobalData = async () => {
  const cacheKey = 'global';
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug('Returning cached global data');
    return cached.data;
  }
  
  try {
    const response = await coingeckoApi.get('/global');
    
    const data = response.data.data;
    
    // Cache the response
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    logger.debug('Fetched global market data');
    return data;
  } catch (error) {
    logger.error('Error fetching global data:', error.message);
    
    // Return fallback data if API fails
    return getFallbackGlobalData();
  }
};

// Fallback data functions
function getFallbackPrices(ids, vs_currencies) {
  const fallbackData = {
    bitcoin: {
      usd: 45000,
      usd_24h_change: 2.34,
      last_updated_at: Math.floor(Date.now() / 1000)
    },
    ethereum: {
      usd: 3000,
      usd_24h_change: 1.23,
      last_updated_at: Math.floor(Date.now() / 1000)
    },
    tether: {
      usd: 1,
      usd_24h_change: 0,
      last_updated_at: Math.floor(Date.now() / 1000)
    },
    'usd-coin': {
      usd: 1,
      usd_24h_change: 0,
      last_updated_at: Math.floor(Date.now() / 1000)
    }
  };
  
  const result = {};
  const idList = ids.split(',');
  
  idList.forEach(id => {
    if (fallbackData[id]) {
      result[id] = fallbackData[id];
    }
  });
  
  return result;
}

function getFallbackMarketData(per_page = 10) {
  const coins = [];
  const baseCoins = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 45000, market_cap: 880000000000, price_change_percentage_24h: 2.34 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3000, market_cap: 360000000000, price_change_percentage_24h: 1.23 },
    { id: 'tether', symbol: 'usdt', name: 'Tether', current_price: 1, market_cap: 83000000000, price_change_percentage_24h: 0 },
    { id: 'binancecoin', symbol: 'bnb', name: 'BNB', current_price: 350, market_cap: 54000000000, price_change_percentage_24h: 3.45 },
    { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 0.6, market_cap: 32000000000, price_change_percentage_24h: -0.5 }
  ];
  
  for (let i = 0; i < Math.min(per_page, baseCoins.length); i++) {
    coins.push(baseCoins[i]);
  }
  
  return coins;
}

function getFallbackCoinInfo(id) {
  const fallbackData = {
    bitcoin: {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      market_data: {
        current_price: { usd: 45000 },
        market_cap: { usd: 880000000000 },
        total_volume: { usd: 25000000000 },
        price_change_percentage_24h: 2.34
      }
    },
    ethereum: {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      market_data: {
        current_price: { usd: 3000 },
        market_cap: { usd: 360000000000 },
        total_volume: { usd: 15000000000 },
        price_change_percentage_24h: 1.23
      }
    }
  };
  
  return fallbackData[id] || fallbackData.bitcoin;
}

function getFallbackGlobalData() {
  return {
    active_cryptocurrencies: 10000,
    upcoming_icos: 150,
    ongoing_icos: 45,
    ended_icos: 12500,
    markets: 800,
    total_market_cap: { usd: 1200000000000 },
    total_volume: { usd: 40000000000 },
    market_cap_percentage: { btc: 45.6, eth: 18.3, usdt: 6.9 },
    market_cap_change_percentage_24h_usd: 2.34
  };
}

// Clear cache function (can be called periodically)
export const clearCache = () => {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION * 10) { // Clear entries older than 10 minutes
      cache.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    logger.debug(`Cleared ${cleared} expired cache entries`);
  }
  
  return cleared;
};