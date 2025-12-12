import axios from 'axios';
import Web3 from 'web3';
import logger from '../utils/logger.js';

// Blockchain API configuration
const BLOCKCHAIN_API_KEY = process.env.BLOCKCHAIN_API_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// Initialize Web3 for Ethereum
let web3;
if (INFURA_PROJECT_ID) {
  web3 = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`));
}

// Blockchain.com API for Bitcoin
const BLOCKCHAIN_API_BASE = 'https://blockchain.info';

/**
 * Generate a new cryptocurrency address
 * @param {string} currency - Cryptocurrency (BTC, ETH, etc.)
 * @returns {Promise<string>} Generated address
 */
export const generateCryptoAddress = async (currency) => {
  try {
    switch (currency.toUpperCase()) {
      case 'BTC':
        return generateBitcoinAddress();
      case 'ETH':
        return generateEthereumAddress();
      case 'USDT':
      case 'USDC':
        return generateEthereumAddress(); // ERC-20 tokens use Ethereum addresses
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  } catch (error) {
    logger.error('Error generating crypto address:', {
      currency,
      error: error.message
    });
    
    // Return a mock address for development
    return generateMockAddress(currency);
  }
};

/**
 * Generate Bitcoin address
 * @returns {Promise<string>} Bitcoin address
 */
const generateBitcoinAddress = async () => {
  // In a real implementation, this would use a Bitcoin wallet library
  // or call a service like Blockcypher, Block.io, or your own Bitcoin node
  
  // For development, return a mock address
  return '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
};

/**
 * Generate Ethereum address
 * @returns {Promise<string>} Ethereum address
 */
const generateEthereumAddress = () => {
  // In a real implementation, this would use Web3 to generate an address
  // from a HD wallet or call a service like Infura, Alchemy, or your own node
  
  if (web3) {
    const account = web3.eth.accounts.create();
    return account.address;
  }
  
  // Fallback to mock address
  return '0x742d35Cc6634C0532925a3b844Bc9e90F1A04F5F';
};

/**
 * Generate mock address for development
 * @param {string} currency - Cryptocurrency
 * @returns {string} Mock address
 */
const generateMockAddress = (currency) => {
  const prefixes = {
    BTC: '1',
    ETH: '0x',
    USDT: '0x',
    USDC: '0x'
  };
  
  const prefix = prefixes[currency.toUpperCase()] || '1';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  
  for (let i = 0; i < 33; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * Validate cryptocurrency address
 * @param {string} address - Cryptocurrency address
 * @param {string} currency - Cryptocurrency
 * @returns {Promise<boolean>} Whether address is valid
 */
export const validateAddress = async (address, currency) => {
  try {
    switch (currency.toUpperCase()) {
      case 'BTC':
        return validateBitcoinAddress(address);
      case 'ETH':
        return validateEthereumAddress(address);
      case 'USDT':
      case 'USDC':
        return validateEthereumAddress(address);
      default:
        return false;
    }
  } catch (error) {
    logger.error('Error validating address:', {
      address,
      currency,
      error: error.message
    });
    return false;
  }
};

/**
 * Validate Bitcoin address
 * @param {string} address - Bitcoin address
 * @returns {Promise<boolean>} Whether address is valid
 */
const validateBitcoinAddress = async (address) => {
  try {
    // Basic regex validation for Bitcoin addresses
    const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/;
    if (!btcRegex.test(address)) {
      return false;
    }
    
    // Optional: Additional validation via blockchain API
    if (BLOCKCHAIN_API_KEY) {
      const response = await axios.get(`${BLOCKCHAIN_API_BASE}/rawaddr/${address}`, {
        params: { api_code: BLOCKCHAIN_API_KEY }
      });
      return response.status === 200;
    }
    
    return true;
  } catch (error) {
    logger.error('Bitcoin address validation error:', error.message);
    return false;
  }
};

/**
 * Validate Ethereum address
 * @param {string} address - Ethereum address
 * @returns {Promise<boolean>} Whether address is valid
 */
const validateEthereumAddress = (address) => {
  try {
    // Basic regex validation for Ethereum addresses
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethRegex.test(address)) {
      return false;
    }
    
    // Optional: Additional validation using Web3
    if (web3) {
      return web3.utils.isAddress(address);
    }
    
    return true;
  } catch (error) {
    logger.error('Ethereum address validation error:', error.message);
    return false;
  }
};

/**
 * Get transaction fee estimate
 * @param {string} currency - Cryptocurrency
 * @param {number} priority - Priority level (1=slow, 2=normal, 3=fast)
 * @returns {Promise<number>} Fee estimate
 */
export const getTransactionFee = async (currency, priority = 2) => {
  try {
    switch (currency.toUpperCase()) {
      case 'BTC':
        return getBitcoinFee(priority);
      case 'ETH':
        return getEthereumFee(priority);
      case 'USDT':
      case 'USDC':
        return getEthereumFee(priority); // ERC-20 tokens use Ethereum gas
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  } catch (error) {
    logger.error('Error getting transaction fee:', {
      currency,
      priority,
      error: error.message
    });
    
    // Return default fees
    return getDefaultFee(currency, priority);
  }
};

/**
 * Get Bitcoin transaction fee
 * @param {number} priority - Priority level
 * @returns {Promise<number>} Fee in BTC
 */
const getBitcoinFee = async (priority) => {
  try {
    const response = await axios.get('https://mempool.space/api/v1/fees/recommended');
    const fees = response.data;
    
    const feeRates = {
      1: fees.hourFee || 1, // Slow
      2: fees.halfHourFee || 5, // Normal
      3: fees.fastestFee || 10 // Fast
    };
    
    // Convert sat/vB to BTC for typical transaction size
    const satPerByte = feeRates[priority] || feeRates[2];
    const btcFee = (satPerByte * 250) / 100000000; // 250 vB typical transaction size
    
    return btcFee;
  } catch (error) {
    logger.error('Error getting Bitcoin fee:', error.message);
    return getDefaultFee('BTC', priority);
  }
};

/**
 * Get Ethereum transaction fee
 * @param {number} priority - Priority level
 * @returns {Promise<number>} Fee in ETH
 */
const getEthereumFee = async (priority) => {
  try {
    if (!web3) {
      throw new Error('Web3 not initialized');
    }
    
    const gasPrice = await web3.eth.getGasPrice();
    const gasPriceWei = web3.utils.toBN(gasPrice);
    
    const multipliers = {
      1: 1, // Slow
      2: 1.2, // Normal
      3: 1.5 // Fast
    };
    
    const multiplier = multipliers[priority] || multipliers[2];
    const adjustedGasPrice = gasPriceWei.muln(multiplier);
    
    // Convert to ETH for typical transaction (21000 gas for ETH transfer, more for tokens)
    const gasLimit = currency === 'ETH' ? 21000 : 65000; // More gas for token transfers
    const feeWei = adjustedGasPrice.muln(gasLimit);
    const feeEth = web3.utils.fromWei(feeWei, 'ether');
    
    return parseFloat(feeEth);
  } catch (error) {
    logger.error('Error getting Ethereum fee:', error.message);
    return getDefaultFee('ETH', priority);
  }
};

/**
 * Get default fee for development
 * @param {string} currency - Cryptocurrency
 * @param {number} priority - Priority level
 * @returns {number} Default fee
 */
const getDefaultFee = (currency, priority) => {
  const defaultFees = {
    BTC: {
      1: 0.0001,
      2: 0.0002,
      3: 0.0005
    },
    ETH: {
      1: 0.001,
      2: 0.002,
      3: 0.005
    },
    USDT: {
      1: 0.001,
      2: 0.002,
      3: 0.005
    },
    USDC: {
      1: 0.001,
      2: 0.002,
      3: 0.005
    }
  };
  
  return defaultFees[currency]?.[priority] || defaultFees[currency]?.[2] || 0.001;
};

/**
 * Check transaction status
 * @param {string} txHash - Transaction hash
 * @param {string} currency - Cryptocurrency
 * @returns {Promise<Object>} Transaction status
 */
export const getTransactionStatus = async (txHash, currency) => {
  try {
    switch (currency.toUpperCase()) {
      case 'BTC':
        return getBitcoinTransactionStatus(txHash);
      case 'ETH':
        return getEthereumTransactionStatus(txHash);
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  } catch (error) {
    logger.error('Error getting transaction status:', {
      txHash,
      currency,
      error: error.message
    });
    
    return {
      hash: txHash,
      status: 'unknown',
      confirmations: 0,
      blockNumber: null,
      timestamp: null
    };
  }
};

/**
 * Get Bitcoin transaction status
 * @param {string} txHash - Transaction hash
 * @returns {Promise<Object>} Transaction status
 */
const getBitcoinTransactionStatus = async (txHash) => {
  try {
    const response = await axios.get(`${BLOCKCHAIN_API_BASE}/rawtx/${txHash}`);
    const data = response.data;
    
    return {
      hash: txHash,
      status: 'confirmed',
      confirmations: data.block_height ? 6 : 0, // Assuming 6 confirmations for security
      blockNumber: data.block_height,
      timestamp: data.time,
      amount: data.out.reduce((sum, output) => sum + output.value, 0) / 100000000,
      fee: data.fee / 100000000
    };
  } catch (error) {
    // If transaction not found, it might be pending
    if (error.response?.status === 404) {
      return {
        hash: txHash,
        status: 'pending',
        confirmations: 0,
        blockNumber: null,
        timestamp: null
      };
    }
    
    throw error;
  }
};

/**
 * Get Ethereum transaction status
 * @param {string} txHash - Transaction hash
 * @returns {Promise<Object>} Transaction status
 */
const getEthereumTransactionStatus = async (txHash) => {
  try {
    if (!web3) {
      throw new Error('Web3 not initialized');
    }
    
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    
    if (!receipt) {
      // Check if transaction exists in mempool
      const tx = await web3.eth.getTransaction(txHash);
      
      if (tx) {
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0,
          blockNumber: null,
          timestamp: null,
          from: tx.from,
          to: tx.to,
          value: web3.utils.fromWei(tx.value, 'ether')
        };
      }
      
      return {
        hash: txHash,
        status: 'not_found',
        confirmations: 0,
        blockNumber: null,
        timestamp: null
      };
    }
    
    const tx = await web3.eth.getTransaction(txHash);
    const block = await web3.eth.getBlock(receipt.blockNumber);
    const currentBlock = await web3.eth.getBlockNumber();
    
    return {
      hash: txHash,
      status: receipt.status ? 'confirmed' : 'failed',
      confirmations: currentBlock - receipt.blockNumber,
      blockNumber: receipt.blockNumber,
      timestamp: block.timestamp,
      from: tx.from,
      to: tx.to,
      value: web3.utils.fromWei(tx.value, 'ether'),
      gasUsed: receipt.gasUsed,
      gasPrice: web3.utils.fromWei(tx.gasPrice, 'gwei'),
      success: receipt.status
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get cryptocurrency balance
 * @param {string} address - Wallet address
 * @param {string} currency - Cryptocurrency
 * @returns {Promise<number>} Balance
 */
export const getBalance = async (address, currency) => {
  try {
    switch (currency.toUpperCase()) {
      case 'BTC':
        return getBitcoinBalance(address);
      case 'ETH':
        return getEthereumBalance(address);
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  } catch (error) {
    logger.error('Error getting balance:', {
      address,
      currency,
      error: error.message
    });
    
    return 0;
  }
};

/**
 * Get Bitcoin balance
 * @param {string} address - Bitcoin address
 * @returns {Promise<number>} Balance in BTC
 */
const getBitcoinBalance = async (address) => {
  try {
    const response = await axios.get(`${BLOCKCHAIN_API_BASE}/rawaddr/${address}`);
    const data = response.data;
    
    return data.final_balance / 100000000;
  } catch (error) {
    logger.error('Error getting Bitcoin balance:', error.message);
    return 0;
  }
};

/**
 * Get Ethereum balance
 * @param {string} address - Ethereum address
 * @returns {Promise<number>} Balance in ETH
 */
const getEthereumBalance = async (address) => {
  try {
    if (!web3) {
      throw new Error('Web3 not initialized');
    }
    
    const balanceWei = await web3.eth.getBalance(address);
    const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
    
    return parseFloat(balanceEth);
  } catch (error) {
    logger.error('Error getting Ethereum balance:', error.message);
    return 0;
  }
};