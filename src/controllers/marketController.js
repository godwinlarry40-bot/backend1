import { getCryptoPrices, getMarketData } from '../lib/coingecko.js';
import logger from '../utils/logger.js';

export const getLivePrices = async (req, res) => {
  try {
    const { currencies = 'bitcoin,ethereum' } = req.query;
    
    const prices = await getCryptoPrices(currencies);
    
    res.status(200).json({
      success: true,
      data: {
        prices,
        timestamp: new Date().toISOString(),
        source: 'CoinGecko'
      }
    });
  } catch (error) {
    logger.error('Get live prices error:', error);
    
    // Fallback to static data if API fails
    const fallbackData = getFallbackPrices();
    
    res.status(200).json({
      success: true,
      data: {
        prices: fallbackData,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: 'Using fallback data due to API issue'
      }
    });
  }
};

export const getMarketOverview = async (req, res) => {
  try {
    const { vs_currency = 'usd', per_page = 50, page = 1 } = req.query;
    
    const marketData = await getMarketData({
      vs_currency,
      per_page,
      page
    });
    
    // Calculate market stats
    const totalMarketCap = marketData.reduce((sum, coin) => sum + coin.market_cap, 0);
    const totalVolume = marketData.reduce((sum, coin) => sum + coin.total_volume, 0);
    const gainers = marketData.filter(coin => coin.price_change_percentage_24h > 0).length;
    const losers = marketData.filter(coin => coin.price_change_percentage_24h < 0).length;
    
    res.status(200).json({
      success: true,
      data: {
        coins: marketData,
        stats: {
          totalCoins: marketData.length,
          totalMarketCap,
          totalVolume,
          gainers,
          losers,
          dominance: calculateDominance(marketData)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get market overview error:', error);
    
    res.status(200).json({
      success: true,
      data: getFallbackMarketData(),
      note: 'Using fallback data due to API issue'
    });
  }
};

export const getCoinDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { vs_currency = 'usd' } = req.query;
    
    // This would call a more detailed endpoint in real implementation
    const priceData = await getCryptoPrices(id);
    
    if (!priceData || Object.keys(priceData).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cryptocurrency not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...priceData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get coin details error:', error);
    
    const fallbackCoin = getFallbackCoinDetails(req.params.id);
    
    if (!fallbackCoin) {
      return res.status(404).json({
        success: false,
        message: 'Cryptocurrency not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: fallbackCoin
    });
  }
};

export const getHistoricalData = async (req, res) => {
  try {
    const { id, vs_currency = 'usd', days = 7 } = req.params;
    
    // In a real implementation, this would fetch historical data from API
    // For now, we'll return mock data
    
    const historicalData = generateHistoricalData(id, parseInt(days));
    
    res.status(200).json({
      success: true,
      data: {
        coin: id,
        currency: vs_currency,
        prices: historicalData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get historical data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical data'
    });
  }
};

export const searchCoins = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    // In a real implementation, this would search through coin list
    // For now, we'll return mock results
    
    const results = searchFallbackCoins(query);
    
    res.status(200).json({
      success: true,
      data: {
        query,
        results,
        count: results.length
      }
    });
  } catch (error) {
    logger.error('Search coins error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
};

// Helper functions
function calculateDominance(marketData) {
  const totalMarketCap = marketData.reduce((sum, coin) => sum + coin.market_cap, 0);
  
  return marketData.slice(0, 10).reduce((acc, coin) => {
    acc[coin.symbol] = ((coin.market_cap / totalMarketCap) * 100).toFixed(2);
    return acc;
  }, {});
}

function getFallbackPrices() {
  return {
    bitcoin: {
      usd: 45000,
      usd_24h_change: 2.34,
      last_updated_at: Date.now() / 1000
    },
    ethereum: {
      usd: 3000,
      usd_24h_change: 1.23,
      last_updated_at: Date.now() / 1000
    }
  };
}

function getFallbackMarketData() {
  const coins = [
    {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      current_price: 45000,
      market_cap: 880000000000,
      market_cap_rank: 1,
      total_volume: 25000000000,
      price_change_percentage_24h: 2.34,
      circulating_supply: 19500000,
      max_supply: 21000000
    },
    {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      current_price: 3000,
      market_cap: 360000000000,
      market_cap_rank: 2,
      total_volume: 15000000000,
      price_change_percentage_24h: 1.23,
      circulating_supply: 120000000,
      max_supply: null
    }
  ];
  
  return {
    coins,
    stats: {
      totalCoins: 2,
      totalMarketCap: 1240000000000,
      totalVolume: 40000000000,
      gainers: 2,
      losers: 0,
      dominance: { btc: '70.97', eth: '29.03' }
    }
  };
}

function getFallbackCoinDetails(id) {
  const coins = {
    bitcoin: {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      current_price: 45000,
      price_change_percentage_24h: 2.34,
      market_cap: 880000000000,
      total_volume: 25000000000,
      circulating_supply: 19500000,
      max_supply: 21000000,
      ath: 69000,
      ath_change_percentage: -34.78,
      atl: 0.06,
      atl_change_percentage: 75000000
    },
    ethereum: {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      current_price: 3000,
      price_change_percentage_24h: 1.23,
      market_cap: 360000000000,
      total_volume: 15000000000,
      circulating_supply: 120000000,
      max_supply: null,
      ath: 4800,
      ath_change_percentage: -37.5,
      atl: 0.43,
      atl_change_percentage: 697674
    }
  };
  
  return coins[id.toLowerCase()];
}

function generateHistoricalData(coinId, days) {
  const basePrice = coinId === 'bitcoin' ? 45000 : 3000;
  const volatility = coinId === 'bitcoin' ? 0.02 : 0.03;
  
  const prices = [];
  const now = Date.now();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const price = basePrice * (1 + randomChange);
    
    prices.push({
      timestamp: date.getTime(),
      price: parseFloat(price.toFixed(2))
    });
  }
  
  return prices;
}

function searchFallbackCoins(query) {
  const allCoins = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
    { id: 'cardano', symbol: 'ada', name: 'Cardano' },
    { id: 'solana', symbol: 'sol', name: 'Solana' },
    { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
    { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
    { id: 'ripple', symbol: 'xrp', name: 'Ripple' },
    { id: 'litecoin', symbol: 'ltc', name: 'Litecoin' },
    { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
    { id: 'stellar', symbol: 'xlm', name: 'Stellar' }
  ];
  
  const lowerQuery = query.toLowerCase();
  
  return allCoins.filter(coin => 
    coin.name.toLowerCase().includes(lowerQuery) ||
    coin.symbol.toLowerCase().includes(lowerQuery) ||
    coin.id.toLowerCase().includes(lowerQuery)
  );
};