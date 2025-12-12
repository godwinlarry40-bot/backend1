import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { generateCryptoAddress } from '../lib/blockchain.js';
import logger from '../utils/logger.js';
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from '../config/constants.js';

export const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    logger.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet'
    });
  }
};

export const deposit = async (req, res) => {
  try {
    const { amount, currency, paymentMethod } = req.body;
    
    // Find or create wallet
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user._id });
    }
    
    // Create pending transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: TRANSACTION_TYPES.DEPOSIT,
      status: TRANSACTION_STATUS.PENDING,
      amount,
      currency,
      netAmount: amount,
      metadata: {
        paymentMethod,
        userId: req.user._id
      }
    });
    
    // In a real implementation, this would integrate with a payment gateway
    // For now, we'll simulate a successful deposit after 5 seconds
    
    setTimeout(async () => {
      try {
        // Add funds to wallet
        await wallet.addFunds(amount, currency);
        
        // Update transaction status
        await transaction.markAsCompleted();
        
        logger.info(`Deposit completed: ${amount} ${currency} for user ${req.user._id}`);
      } catch (error) {
        logger.error('Deposit processing error:', error);
        await transaction.markAsFailed('Processing error');
      }
    }, 5000);
    
    res.status(202).json({
      success: true,
      message: 'Deposit initiated',
      data: {
        transactionId: transaction._id,
        status: 'pending',
        estimatedCompletion: '5 seconds'
      }
    });
  } catch (error) {
    logger.error('Deposit initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate deposit'
    });
  }
};

export const withdraw = async (req, res) => {
  try {
    const { amount, currency, walletAddress } = req.body;
    
    // Find wallet
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check sufficient funds
    if (!wallet.hasSufficientFunds(amount, currency)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }
    
    // Calculate network fee (this would come from blockchain API in real implementation)
    const networkFee = getNetworkFee(currency);
    
    // Check if amount after fee is positive
    const netAmount = amount - networkFee;
    if (netAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount too small after network fees'
      });
    }
    
    // Create pending transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: TRANSACTION_TYPES.WITHDRAWAL,
      status: TRANSACTION_STATUS.PENDING,
      amount,
      currency,
      networkFee,
      netAmount,
      toAddress: walletAddress,
      metadata: {
        userId: req.user._id,
        walletAddress
      }
    });
    
    // Lock funds
    await wallet.lockFunds(amount, currency);
    
    // In a real implementation, this would send the crypto transaction
    // For now, we'll simulate processing
    
    setTimeout(async () => {
      try {
        // Deduct funds from wallet
        await wallet.deductFunds(amount, currency);
        
        // Unlock funds
        await wallet.unlockFunds(amount, currency);
        
        // Generate mock transaction hash
        const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        
        // Update transaction status
        await transaction.markAsCompleted(txHash);
        
        logger.info(`Withdrawal completed: ${amount} ${currency} to ${walletAddress}`);
      } catch (error) {
        logger.error('Withdrawal processing error:', error);
        await transaction.markAsFailed('Processing error');
        await wallet.unlockFunds(amount, currency);
      }
    }, 10000);
    
    res.status(202).json({
      success: true,
      message: 'Withdrawal initiated',
      data: {
        transactionId: transaction._id,
        amount,
        netAmount,
        networkFee,
        walletAddress,
        status: 'pending',
        estimatedCompletion: '10 seconds'
      }
    });
  } catch (error) {
    logger.error('Withdrawal initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate withdrawal'
    });
  }
};

export const getDepositAddress = async (req, res) => {
  try {
    const { currency } = req.params;
    
    // Find wallet
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user._id });
    }
    
    // Check if address already exists
    const addressKey = `${currency}Address`;
    if (wallet.walletAddresses[currency]) {
      return res.status(200).json({
        success: true,
        data: {
          address: wallet.walletAddresses[currency],
          currency
        }
      });
    }
    
    // Generate new address (in real implementation, this would call blockchain API)
    const newAddress = await generateCryptoAddress(currency);
    
    // Save address to wallet
    wallet.walletAddresses[currency] = newAddress;
    await wallet.save();
    
    res.status(200).json({
      success: true,
      data: {
        address: newAddress,
        currency,
        isNew: true
      }
    });
  } catch (error) {
    logger.error('Get deposit address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate deposit address'
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { type, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const filter = { userId: req.user._id };
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments(filter);
    
    // Get transaction summary
    const summary = await Transaction.getUserSummary(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary
      }
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

export const getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction'
    });
  }
};

// Helper function to get network fees
function getNetworkFee(currency) {
  const fees = {
    BTC: 0.0005,
    ETH: 0.005,
    USDT: 1,
    USDC: 1
  };
  
  return fees[currency] || 0.001;
};