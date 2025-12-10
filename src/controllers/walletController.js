import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';

export const getWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    
    if (!wallet) {
      const error = new Error('Wallet not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      wallet
    });
  } catch (error) {
    next(error);
  }
};

export const deposit = async (req, res, next) => {
  try {
    const { symbol, amount } = req.body;
    
    if (!symbol || !amount || amount <= 0) {
      const error = new Error('Invalid deposit details');
      error.statusCode = 400;
      throw error;
    }

    const wallet = await Wallet.findOne({ userId: req.user._id });
    
    if (!wallet) {
      const error = new Error('Wallet not found');
      error.statusCode = 404;
      throw error;
    }

    // Find or create balance for this symbol
    let balance = wallet.balances.find(b => b.symbol === symbol.toUpperCase());
    
    if (balance) {
      balance.available += amount;
      balance.totalValueUSD += amount; // This should be calculated with real prices
    } else {
      wallet.balances.push({
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        available: amount,
        locked: 0,
        totalValueUSD: amount
      });
    }

    await wallet.save();

    // Record transaction
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'deposit',
      assetSymbol: symbol.toUpperCase(),
      amount,
      status: 'completed',
      metadata: { manualDeposit: true }
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Deposit successful',
      wallet: wallet.balances
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    next(error);
  }
}; 