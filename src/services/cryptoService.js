import axios from 'axios';
import { getCryptoPrices } from '../lib/coingecko.js';
import logger from '../utils/logger.js';

export const getPortfolioValue = async (wallet, cryptoPrices = null) => {
  try {
    if (!cryptoPrices) {
      cryptoPrices = await getCryptoPrices('bitcoin,ethereum');
    }
    
    let totalValue = wallet.balances.USD || 0;
    
    // Add crypto values
    const cryptoBalances = {
      BTC: wallet.balances.BTC || 0,
      ETH: wallet.balances.ETH || 0,
      USDT: wallet.balances.USDT || 0,
      USDC: wallet.balances.USDC || 0
    };
    
    for (const [currency, balance] of Object.entries(cryptoBalances)) {
      if (balance > 0) {
        const price = getCryptoPrice(cryptoPrices, currency);
        totalValue += balance * price;
      }
    }
    
    return totalValue;
  } catch (error) {
    logger.error('Get portfolio value error:', error);
    return wallet.totalValueUSD || 0;
  }
};

export const calculate24hChange = async (wallet, previousValue) => {
  try {
    const currentValue = await getPortfolioValue(wallet);
    
    if (!previousValue || previousValue === 0) {
      return 0;
    }
    
    const change = currentValue - previousValue;
    const changePercent = (change / previousValue) * 100;
    
    return {
      change,
      changePercent,
      currentValue,
      previousValue
    };
  } catch (error) {
    logger.error('Calculate 24h change error:', error);
    return {
      change: 0,
      changePercent: 0,
      currentValue: wallet.totalValueUSD || 0,
      previousValue: previousValue || 0
    };
  }
};

export const getMarketTrends = async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/global');
    
    return {
      totalMarketCap: response.data.data.total_market_cap.usd,
      totalVolume: response.data.data.total_volume.usd,
      marketCapChange24h: response.data.data.market_cap_change_percentage_24h_usd,
      btcDominance: response.data.data.market_cap_percentage.btc,
      ethDominance: response.data.data.market_cap_percentage.eth,
      activeCryptocurrencies: response.data.data.active_cryptocurrencies,
      upcomingIcos: response.data.data.upcoming_icos,
      ongoingIcos: response.data.data.ongoing_icos,
      endedIcos: response.data.data.ended_icos
    };
  } catch (error) {
    logger.error('Get market trends error:', error);
    
    // Fallback data
    return {
      totalMarketCap: 1200000000000,
      totalVolume: 40000000000,
      marketCapChange24h: 2.34,
      btcDominance: 45.6,
      ethDominance: 18.3,
      activeCryptocurrencies: 10000,
      upcomingIcos: 150,
      ongoingIcos: 45,
      endedIcos: 12500
    };
  }
};

export const getPriceAlerts = async (userId, thresholds) => {
  try {
    const cryptoPrices = await getCryptoPrices(Object.keys(thresholds).join(','));
    
    const alerts = [];
    
    for (const [currency, threshold] of Object.entries(thresholds)) {
      const currentPrice = getCryptoPrice(cryptoPrices, currency);
      
      if (currentPrice >= threshold.upper) {
        alerts.push({
          currency,
          type: 'above',
          threshold: threshold.upper,
          currentPrice,
          message: `${currency} price is above ${threshold.upper}`
        });
      }
      
      if (currentPrice <= threshold.lower) {
        alerts.push({
          currency,
          type: 'below',
          threshold: threshold.lower,
          currentPrice,
          message: `${currency} price is below ${threshold.lower}`
        });
      }
    }
    
    return alerts;
  } catch (error) {
    logger.error('Get price alerts error:', error);
    return [];
  }
};

export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Get conversion rates
    const cryptoPrices = await getCryptoPrices(`${fromCurrency},${toCurrency}`);
    
    const fromPrice = getCryptoPrice(cryptoPrices, fromCurrency);
    const toPrice = getCryptoPrice(cryptoPrices, toCurrency);
    
    if (fromPrice === 0 || toPrice === 0) {
      throw new Error('Invalid currency prices');
    }
    
    // Convert via USD
    const amountInUSD = amount * fromPrice;
    const convertedAmount = amountInUSD / toPrice;
    
    return convertedAmount;
  } catch (error) {
    logger.error('Convert currency error:', error);
    throw error;
  }
};

export const calculateTransactionFee = (amount, currency, type) => {
  // Fee structure
  const feeRates = {
    deposit: {
      credit_card: 0.029, // 2.9%
      bank_transfer: 0.01, // 1%
      crypto: 0.001 // 0.1%
    },
    withdrawal: {
      bank_transfer: 0.02, // 2%
      crypto: 0.005 // 0.5%
    }
  };
  
  const networkFees = {
    BTC: 0.0005,
    ETH: 0.005,
    USDT: 1,
    USDC: 1
  };
  
  let platformFee = 0;
  let networkFee = 0;
  
  // Calculate platform fee
  if (feeRates[type]) {
    const method = type === 'withdrawal' ? 'bank_transfer' : 'credit_card'; // Default method
    const rate = feeRates[type][method] || 0.02; // Default 2%
    platformFee = amount * rate;
  }
  
  // Calculate network fee for crypto
  if (['BTC', 'ETH', 'USDT', 'USDC'].includes(currency)) {
    networkFee = networkFees[currency] || 0.001;
  }
  
  return {
    platformFee,
    networkFee,
    totalFee: platformFee + networkFee,
    netAmount: amount - (platformFee + networkFee)
  };
};

// Helper function
function getCryptoPrice(cryptoPrices, currency) {
  const currencyMap = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    USDC: 'usd-coin'
  };
  
  const coinId = currencyMap[currency] || currency.toLowerCase();
  
  if (cryptoPrices[coinId]) {
    return cryptoPrices[coinId].usd;
  }
  
  // Fallback prices
  const fallbackPrices = {
    bitcoin: 45000,
    ethereum: 3000,
    tether: 1,
    'usd-coin': 1,
    btc: 45000,
    eth: 3000,
    usdt: 1,
    usdc: 1
  };
  
  return fallbackPrices[coinId] || 0;
};