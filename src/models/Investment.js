import mongoose from 'mongoose';

const InvestmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planName: {
    type: String,
    required: true,
    enum: ['short-term', 'mid-term', 'long-term']
  },
  assetSymbol: {
    type: String,
    required: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },
  apyPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  expectedProfit: {
    type: Number,
    default: 0
  },
  actualProfit: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'withdrawn'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate expected profit before saving
InvestmentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('apyPercentage') || this.isModified('durationDays')) {
    const yearlyProfit = (this.amount * this.apyPercentage) / 100;
    const dailyProfit = yearlyProfit / 365;
    this.expectedProfit = dailyProfit * this.durationDays;
  }
  
  // Calculate end date if not provided
  if (!this.endDate && this.durationDays) {
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + this.durationDays);
    this.endDate = endDate;
  }
  
  next();
});

export default mongoose.model('Investment', InvestmentSchema);