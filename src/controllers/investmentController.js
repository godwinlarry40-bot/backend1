import Investment from '../models/Investment.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { calculateInvestmentReturns } from '../services/investmentService.js';
import logger from '../utils/logger.js';
import { INVESTMENT_STATUS, TRANSACTION_TYPES } from '../config/constants.js';

export const createInvestment = async (req, res) => {
  try {
    const { plan, amount, duration, isCompounding, compoundingFrequency } = req.body;
    
    // Find wallet
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check sufficient funds
    if (!wallet.hasSufficientFunds(amount, 'USD')) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }
    
    // Create transaction for investment
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: TRANSACTION_TYPES.INVESTMENT,
      status: 'completed',
      amount,
      currency: 'USD',
      netAmount: amount,
      description: `Investment in ${plan} plan`
    });
    
    // Lock funds in wallet
    await wallet.lockFunds(amount, 'USD');
    
    // Create investment
    const investment = await Investment.create({
      userId: req.user._id,
      plan,
      amount,
      duration,
      isCompounding,
      compoundingFrequency,
      transactionIds: [transaction._id]
    });
    
    logger.info(`Investment created: ${investment._id} for user ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Investment created successfully',
      data: { investment }
    });
  } catch (error) {
    logger.error('Create investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create investment'
    });
  }
};

export const getInvestments = async (req, res) => {
  try {
    const { status, plan, page = 1, limit = 20 } = req.query;
    
    const filter = { userId: req.user._id };
    
    if (status) filter.status = status;
    if (plan) filter.plan = plan;
    
    const skip = (page - 1) * limit;
    
    const investments = await Investment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Investment.countDocuments(filter);
    
    // Get investment summary
    const summary = await Investment.getInvestmentSummary(req.user._id);
    
    // Calculate total portfolio value
    const activeInvestments = investments.filter(inv => inv.status === 'active');
    const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpectedProfit = activeInvestments.reduce((sum, inv) => sum + inv.expectedProfit, 0);
    
    res.status(200).json({
      success: true,
      data: {
        investments,
        summary: {
          ...summary,
          totalInvested,
          totalExpectedProfit
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get investments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investments'
    });
  }
};

export const getInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('transactionIds');
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }
    
    // Calculate current value and returns
    const currentValue = await calculateInvestmentReturns(investment);
    
    res.status(200).json({
      success: true,
      data: {
        investment,
        performance: {
          currentValue,
          profit: currentValue - investment.amount,
          roi: ((currentValue - investment.amount) / investment.amount) * 100,
          daysRemaining: Math.max(0, Math.floor((investment.endDate - new Date()) / (1000 * 60 * 60 * 24)))
        }
      }
    });
  } catch (error) {
    logger.error('Get investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investment'
    });
  }
};

export const cancelInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Active investment not found'
      });
    }
    
    // Check if cancellation is allowed (e.g., minimum lock period)
    const daysInvested = Math.floor((new Date() - investment.startDate) / (1000 * 60 * 60 * 24));
    const minLockPeriod = 7; // Minimum 7 days lock
    
    if (daysInvested < minLockPeriod) {
      return res.status(400).json({
        success: false,
        message: `Investments can only be cancelled after ${minLockPeriod} days`
      });
    }
    
    // Calculate early cancellation fee (if any)
    const cancellationFee = investment.amount * 0.01; // 1% fee
    const refundAmount = investment.amount - cancellationFee;
    
    // Cancel investment
    await investment.cancel('User requested cancellation');
    
    // Unlock funds from wallet
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (wallet) {
      await wallet.unlockFunds(investment.amount, 'USD');
      await wallet.addFunds(refundAmount, 'USD');
    }
    
    // Create transaction for refund
    await Transaction.create({
      userId: req.user._id,
      type: TRANSACTION_TYPES.WITHDRAWAL,
      status: 'completed',
      amount: refundAmount,
      currency: 'USD',
      netAmount: refundAmount,
      description: `Refund from cancelled investment ${investment._id}`,
      metadata: {
        investmentId: investment._id,
        cancellationFee
      }
    });
    
    logger.info(`Investment cancelled: ${investment._id} for user ${req.user._id}`);
    
    res.status(200).json({
      success: true,
      message: 'Investment cancelled successfully',
      data: {
        investment,
        refundAmount,
        cancellationFee
      }
    });
  } catch (error) {
    logger.error('Cancel investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel investment'
    });
  }
};

export const getInvestmentStats = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user._id });
    
    // Calculate various statistics
    const stats = {
      totalInvestments: investments.length,
      totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
      totalProfit: investments.reduce((sum, inv) => sum + inv.actualProfit, 0),
      totalFees: investments.reduce((sum, inv) => sum + inv.totalFees, 0),
      
      byPlan: {
        short: investments.filter(inv => inv.plan === 'short').length,
        mid: investments.filter(inv => inv.plan === 'mid').length,
        long: investments.filter(inv => inv.plan === 'long').length
      },
      
      byStatus: {
        active: investments.filter(inv => inv.status === 'active').length,
        completed: investments.filter(inv => inv.status === 'completed').length,
        cancelled: investments.filter(inv => inv.status === 'cancelled').length
      },
      
      averageReturns: {
        short: calculateAverageReturn(investments.filter(inv => inv.plan === 'short')),
        mid: calculateAverageReturn(investments.filter(inv => inv.plan === 'mid')),
        long: calculateAverageReturn(investments.filter(inv => inv.plan === 'long')),
        overall: calculateAverageReturn(investments)
      },
      
      currentPortfolio: {
        totalValue: investments
          .filter(inv => inv.status === 'active')
          .reduce((sum, inv) => sum + inv.amount + (inv.actualProfit || 0), 0),
        activeInvestments: investments.filter(inv => inv.status === 'active').length,
        estimatedMonthlyIncome: calculateEstimatedMonthlyIncome(investments)
      }
    };
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get investment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investment statistics'
    });
  }
};

export const simulateInvestment = async (req, res) => {
  try {
    const { plan, amount, duration, isCompounding, compoundingFrequency } = req.body;
    
    if (!plan || !amount || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Plan, amount, and duration are required'
      });
    }
    
    // Create a temporary investment object for simulation
    const tempInvestment = {
      plan,
      amount: parseFloat(amount),
      duration: parseInt(duration),
      isCompounding: isCompounding || false,
      compoundingFrequency: compoundingFrequency || 'none'
    };
    
    // Calculate returns
    const simulation = await calculateInvestmentReturns(tempInvestment, true);
    
    res.status(200).json({
      success: true,
      data: {
        simulation,
        parameters: tempInvestment
      }
    });
  } catch (error) {
    logger.error('Simulate investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate investment'
    });
  }
};

// Helper functions
function calculateAverageReturn(investments) {
  if (investments.length === 0) return 0;
  
  const completedInvestments = investments.filter(inv => inv.status === 'completed');
  if (completedInvestments.length === 0) return 0;
  
  const totalReturn = completedInvestments.reduce((sum, inv) => {
    const roi = ((inv.actualProfit || 0) / inv.amount) * 100;
    return sum + roi;
  }, 0);
  
  return totalReturn / completedInvestments.length;
}

function calculateEstimatedMonthlyIncome(investments) {
  const activeInvestments = investments.filter(inv => inv.status === 'active');
  
  return activeInvestments.reduce((sum, inv) => {
    const monthlyRate = inv.expectedReturnRate / (inv.duration / 30); // Convert to monthly
    return sum + (inv.amount * monthlyRate / 100);
  }, 0);
};