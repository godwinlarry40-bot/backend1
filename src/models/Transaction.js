import mongoose from 'mongoose';
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from '../config/constants.js';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(TRANSACTION_TYPES),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
    default: TRANSACTION_STATUS.PENDING
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  fromAddress: {
    type: String,
    trim: true
  },
  toAddress: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  txHash: {
    type: String,
    trim: true,
    // ❌ REMOVED: sparse: true from here
    // Only define unique/constraints at field level OR in schema.index(), not both
  },
  networkFee: {
    type: Number,
    default: 0
  },
  platformFee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: 1 });
transactionSchema.index({ txHash: 1 }, { 
  unique: true, 
  sparse: true,  // ✅ Keep sparse here, removed from field definition
  // Optional: Add partialFilterExpression for more control
  // partialFilterExpression: { txHash: { $exists: true, $type: "string" } }
});

// Pre-save middleware to calculate net amount
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('networkFee') || this.isModified('platformFee')) {
    this.netAmount = this.amount - this.networkFee - this.platformFee;
  }
  next();
});

// Method to mark transaction as completed
transactionSchema.methods.markAsCompleted = function(txHash = null) {
  this.status = TRANSACTION_STATUS.COMPLETED;
  this.completedAt = new Date();
  if (txHash) {
    this.txHash = txHash;
  }
  return this.save();
};

// Method to mark transaction as failed
transactionSchema.methods.markAsFailed = function(reason) {
  this.status = TRANSACTION_STATUS.FAILED;
  this.failureReason = reason;
  return this.save();
};

// Method to mark transaction as cancelled
transactionSchema.methods.markAsCancelled = function() {
  this.status = TRANSACTION_STATUS.CANCELLED;
  this.cancelledAt = new Date();
  return this.save();
};

// Static method to get user's transaction summary
transactionSchema.statics.getUserSummary = async function(userId) {
  // ✅ FIXED: Use new mongoose.Types.ObjectId syntax
  const objectId = new mongoose.Types.ObjectId(userId);
  
  const result = await this.aggregate([
    {
      $match: {
        userId: objectId,
        status: TRANSACTION_STATUS.COMPLETED
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        totalFees: { $sum: { $add: ['$networkFee', '$platformFee'] } }
      }
    }
  ]);
  
  return result.reduce((acc, curr) => {
    acc[curr._id] = {
      totalAmount: curr.totalAmount,
      count: curr.count,
      totalFees: curr.totalFees
    };
    return acc;
  }, {});
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;