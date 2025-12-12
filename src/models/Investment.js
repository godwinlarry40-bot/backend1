import mongoose from 'mongoose';
import { INVESTMENT_STATUS, INVESTMENT_PLANS } from '../config/constants.js';

const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['short', 'mid', 'long'],
    required: true
  },
  planDetails: {
    name: String,
    minDays: Number,
    maxDays: Number,
    managementFee: Number,
    performanceFee: Number,
    minInvestment: Number
  },
  amount: {
    type: Number,
    required: true,
    min: 100
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  duration: {
    type: Number, // in days
    required: true,
    min: 7,
    max: 720
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(INVESTMENT_STATUS),
    default: INVESTMENT_STATUS.ACTIVE
  },
  expectedReturnRate: {
    type: Number,
    min: 0,
    max: 100
  },
  actualReturnRate: {
    type: Number,
    min: 0,
    max: 100
  },
  expectedProfit: {
    type: Number,
    min: 0
  },
  actualProfit: {
    type: Number,
    default: 0
  },
  managementFeeAmount: {
    type: Number,
    default: 0
  },
  performanceFeeAmount: {
    type: Number,
    default: 0
  },
  totalFees: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number
  },
  isCompounding: {
    type: Boolean,
    default: false
  },
  compoundingFrequency: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly', 'quarterly'],
    default: 'none'
  },
  transactionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  notes: {
    type: String,
    trim: true
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to set plan details and dates
investmentSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set plan details
    const planKey = this.plan.toUpperCase() + '_TERM';
    this.planDetails = INVESTMENT_PLANS[planKey];
    
    // Set dates
    this.startDate = new Date();
    this.endDate = new Date();
    this.endDate.setDate(this.endDate.getDate() + this.duration);
    
    // Calculate expected return based on plan
    let baseRate;
    switch(this.plan) {
      case 'short':
        baseRate = 8; // 8% annual
        break;
      case 'mid':
        baseRate = 12; // 12% annual
        break;
      case 'long':
        baseRate = 15; // 15% annual
        break;
      default:
        baseRate = 10;
    }
    
    // Adjust for duration (annual to period rate)
    this.expectedReturnRate = (baseRate * this.duration) / 365;
    this.expectedProfit = (this.amount * this.expectedReturnRate) / 100;
    
    // Calculate fees
    const dailyRate = this.duration / 365;
    this.managementFeeAmount = this.amount * this.planDetails.managementFee * dailyRate;
    this.totalFees = this.managementFeeAmount;
  }
  
  // Calculate net amount
  if (this.actualProfit !== undefined) {
    this.netAmount = this.amount + this.actualProfit - this.totalFees;
  }
  
  next();
});

// Method to calculate profit
investmentSchema.methods.calculateProfit = function(currentValue) {
  const profit = currentValue - this.amount;
  this.actualProfit = Math.max(0, profit);
  
  // Calculate performance fee if profit positive
  if (profit > 0) {
    this.performanceFeeAmount = profit * this.planDetails.performanceFee;
    this.totalFees = this.managementFeeAmount + this.performanceFeeAmount;
  }
  
  this.netAmount = this.amount + this.actualProfit - this.totalFees;
  return this.save();
};

// Method to mark as completed
investmentSchema.methods.markAsCompleted = function() {
  this.status = INVESTMENT_STATUS.COMPLETED;
  this.completedAt = new Date();
  return this.save();
};

// Method to cancel investment
investmentSchema.methods.cancel = function(reason) {
  this.status = INVESTMENT_STATUS.CANCELLED;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

// Static method to get active investments
investmentSchema.statics.getActiveInvestments = async function(userId) {
  return this.find({
    userId,
    status: INVESTMENT_STATUS.ACTIVE,
    endDate: { $gt: new Date() }
  }).sort({ endDate: 1 });
};

// Static method to get investment summary
investmentSchema.statics.getInvestmentSummary = async function(userId) {
  const result = await this.aggregate([
    {
      $match: { userId: mongoose.Types.ObjectId(userId) }
    },
    {
      $group: {
        _id: '$status',
        totalAmount: { $sum: '$amount' },
        totalProfit: { $sum: '$actualProfit' },
        totalFees: { $sum: '$totalFees' },
        count: { $sum: 1 },
        avgReturn: { $avg: '$actualReturnRate' }
      }
    }
  ]);
  
  return result.reduce((acc, curr) => {
    acc[curr._id] = {
      totalAmount: curr.totalAmount,
      totalProfit: curr.totalProfit,
      totalFees: curr.totalFees,
      count: curr.count,
      avgReturn: curr.avgReturn
    };
    return acc;
  }, {});
};

const Investment = mongoose.model('Investment', investmentSchema);

export default Investment;