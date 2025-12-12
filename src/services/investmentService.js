import Investment from '../models/Investment.js';
import { getCryptoPrices } from '../lib/coingecko.js';
import logger from '../utils/logger.js';
import { INVESTMENT_PLANS } from '../config/constants.js';

export const calculateInvestmentReturns = async (investment, isSimulation = false) => {
  try {
    const now = new Date();
    const startDate = isSimulation ? now : investment.startDate;
    const endDate = isSimulation ? new Date(now.getTime() + investment.duration * 24 * 60 * 60 * 1000) : investment.endDate;
    
    const daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Get plan details
    const planKey = investment.plan.toUpperCase() + '_TERM';
    const planDetails = INVESTMENT_PLANS[planKey] || INVESTMENT_PLANS.MID_TERM;
    
    // Base annual return rate based on plan
    let baseAnnualRate;
    switch(investment.plan) {
      case 'short':
        baseAnnualRate = 0.08; // 8%
        break;
      case 'mid':
        baseAnnualRate = 0.12; // 12%
        break;
      case 'long':
        baseAnnualRate = 0.15; // 15%
        break;
      default:
        baseAnnualRate = 0.10; // 10%
    }
    
    // Calculate period return rate
    const periodRate = (baseAnnualRate * investment.duration) / 365;
    
    // Calculate expected profit
    let expectedProfit = investment.amount * periodRate;
    
    // Apply compounding if enabled
    if (investment.isCompounding && investment.compoundingFrequency !== 'none') {
      expectedProfit = calculateCompoundedReturns(
        investment.amount,
        baseAnnualRate,
        investment.duration,
        investment.compoundingFrequency
      ) - investment.amount;
    }
    
    // Calculate management fee
    const dailyManagementFee = planDetails.managementFee / 365;
    const managementFee = investment.amount * dailyManagementFee * investment.duration;
    
    // For simulation, we calculate current value based on elapsed time
    let currentValue = investment.amount;
    let currentProfit = 0;
    
    if (isSimulation) {
      // Calculate profit up to current point in simulation
      const elapsedRate = (baseAnnualRate * daysElapsed) / 365;
      currentProfit = investment.amount * elapsedRate;
      currentValue = investment.amount + currentProfit;
    } else if (investment.status === 'active') {
      // For active investments, calculate based on market performance
      // In a real implementation, this would use actual market data
      const marketPerformance = await getMarketPerformance(investment.startDate);
      currentProfit = investment.amount * (periodRate * marketPerformance);
      currentValue = investment.amount + currentProfit;
    } else if (investment.status === 'completed') {
      // Use actual profit for completed investments
      currentProfit = investment.actualProfit || 0;
      currentValue = investment.netAmount || (investment.amount + currentProfit);
    }
    
    // Calculate performance fee if profit is positive
    let performanceFee = 0;
    if (currentProfit > 0) {
      performanceFee = currentProfit * planDetails.performanceFee;
    }
    
    const totalFees = managementFee + performanceFee;
    const netValue = currentValue - totalFees;
    
    return {
      investmentId: investment._id,
      plan: investment.plan,
      amount: investment.amount,
      duration: investment.duration,
      daysElapsed,
      totalDays,
      percentageComplete: (daysElapsed / totalDays) * 100,
      
      // Returns
      expectedProfit,
      currentProfit,
      currentValue,
      
      // Fees
      managementFee,
      performanceFee,
      totalFees,
      
      // Final values
      netValue,
      roi: ((currentProfit - totalFees) / investment.amount) * 100,
      annualizedRoi: (((currentProfit - totalFees) / investment.amount) * (365 / daysElapsed)) * 100 || 0,
      
      // Dates
      startDate,
      endDate,
      currentDate: now,
      
      // Status
      status: investment.status || 'active',
      isCompounding: investment.isCompounding || false,
      compoundingFrequency: investment.compoundingFrequency || 'none'
    };
  } catch (error) {
    logger.error('Calculate investment returns error:', error);
    
    // Return basic calculation as fallback
    return {
      investmentId: investment._id,
      amount: investment.amount,
      currentValue: investment.amount,
      currentProfit: 0,
      netValue: investment.amount,
      roi: 0,
      status: 'calculation_error'
    };
  }
};

export const processInvestmentMaturity = async (investmentId) => {
  try {
    const investment = await Investment.findById(investmentId);
    
    if (!investment || investment.status !== 'active') {
      throw new Error('Investment not found or not active');
    }
    
    // Check if investment has matured
    if (new Date() < investment.endDate) {
      return {
        processed: false,
        message: 'Investment has not yet matured'
      };
    }
    
    // Calculate final returns
    const returns = await calculateInvestmentReturns(investment);
    
    // Update investment with final values
    investment.actualProfit = returns.currentProfit;
    investment.actualReturnRate = returns.roi;
    investment.performanceFeeAmount = returns.performanceFee;
    investment.totalFees = returns.totalFees;
    investment.netAmount = returns.netValue;
    
    await investment.markAsCompleted();
    
    // Unlock funds in wallet
    // This would require wallet service integration
    
    // Create profit distribution transaction
    // This would require transaction service integration
    
    logger.info(`Investment matured: ${investmentId}`);
    
    return {
      processed: true,
      investment,
      returns
    };
  } catch (error) {
    logger.error('Process investment maturity error:', error);
    throw error;
  }
};

export const autoReinvest = async (investmentId) => {
  try {
    const investment = await Investment.findById(investmentId);
    
    if (!investment || investment.status !== 'completed') {
      throw new Error('Investment not found or not completed');
    }
    
    // Check if auto-reinvestment is enabled in user preferences
    // This would require user preferences check
    
    // Create new investment with profit included
    const newInvestment = await Investment.create({
      userId: investment.userId,
      plan: investment.plan,
      amount: investment.netAmount, // Reinvest principal + profit
      duration: investment.duration,
      isCompounding: investment.isCompounding,
      compoundingFrequency: investment.compoundingFrequency,
      transactionIds: investment.transactionIds,
      notes: `Auto-reinvestment from ${investment._id}`
    });
    
    logger.info(`Auto-reinvested: ${investmentId} -> ${newInvestment._id}`);
    
    return newInvestment;
  } catch (error) {
    logger.error('Auto reinvest error:', error);
    throw error;
  }
};

export const getInvestmentPerformance = async (userId, period = 'all') => {
  try {
    const investments = await Investment.find({ userId });
    
    // Filter by period if needed
    let filteredInvestments = investments;
    if (period !== 'all') {
      const cutoffDate = getCutoffDate(period);
      filteredInvestments = investments.filter(inv => 
        inv.startDate >= cutoffDate
      );
    }
    
    // Calculate performance metrics
    const performance = {
      totalInvested: filteredInvestments.reduce((sum, inv) => sum + inv.amount, 0),
      totalProfit: filteredInvestments.reduce((sum, inv) => sum + (inv.actualProfit || 0), 0),
      totalFees: filteredInvestments.reduce((sum, inv) => sum + (inv.totalFees || 0), 0),
      netProfit: filteredInvestments.reduce((sum, inv) => 
        sum + (inv.actualProfit || 0) - (inv.totalFees || 0), 0
      ),
      count: filteredInvestments.length,
      averageRoi: 0,
      bestInvestment: null,
      worstInvestment: null
    };
    
    // Calculate ROI for each investment
    const investmentsWithRoi = filteredInvestments.map(inv => {
      const roi = inv.actualProfit ? 
        ((inv.actualProfit - (inv.totalFees || 0)) / inv.amount) * 100 : 0;
      return { ...inv.toObject(), roi };
    });
    
    // Calculate average ROI
    const validRois = investmentsWithRoi
      .filter(inv => inv.roi !== 0)
      .map(inv => inv.roi);
    
    if (validRois.length > 0) {
      performance.averageRoi = validRois.reduce((sum, roi) => sum + roi, 0) / validRois.length;
    }
    
    // Find best and worst investments
    if (investmentsWithRoi.length > 0) {
      performance.bestInvestment = investmentsWithRoi.reduce((best, current) => 
        current.roi > best.roi ? current : best
      );
      
      performance.worstInvestment = investmentsWithRoi.reduce((worst, current) => 
        current.roi < worst.roi ? current : worst
      );
    }
    
    // Group by plan
    performance.byPlan = {
      short: investmentsWithRoi.filter(inv => inv.plan === 'short'),
      mid: investmentsWithRoi.filter(inv => inv.plan === 'mid'),
      long: investmentsWithRoi.filter(inv => inv.plan === 'long')
    };
    
    // Group by status
    performance.byStatus = {
      active: investmentsWithRoi.filter(inv => inv.status === 'active'),
      completed: investmentsWithRoi.filter(inv => inv.status === 'completed'),
      cancelled: investmentsWithRoi.filter(inv => inv.status === 'cancelled')
    };
    
    return performance;
  } catch (error) {
    logger.error('Get investment performance error:', error);
    throw error;
  }
};

// Helper functions
function calculateCompoundedReturns(principal, annualRate, days, frequency) {
  let n;
  switch(frequency) {
    case 'daily':
      n = 365;
      break;
    case 'weekly':
      n = 52;
      break;
    case 'monthly':
      n = 12;
      break;
    case 'quarterly':
      n = 4;
      break;
    default:
      return principal * (1 + annualRate * days / 365); // Simple interest
  }
  
  const years = days / 365;
  const ratePerPeriod = annualRate / n;
  const periods = n * years;
  
  return principal * Math.pow(1 + ratePerPeriod, periods);
}

async function getMarketPerformance(startDate) {
  try {
    // In a real implementation, this would calculate actual market performance
    // For now, we'll use a simulated performance based on time
    const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    
    // Simulate some market volatility
    const basePerformance = 1 + (daysSinceStart * 0.0005); // 0.05% per day
    const volatility = 0.001; // 0.1% daily volatility
    
    // Add random market movement
    const randomMove = (Math.random() - 0.5) * 2 * volatility;
    
    return Math.max(0.8, basePerformance + randomMove); // Ensure at least 80% of expected
  } catch (error) {
    logger.error('Get market performance error:', error);
    return 1.0; // Neutral performance
  }
}

function getCutoffDate(period) {
  const now = new Date();
  
  switch(period) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0); // Beginning of time
  }
};