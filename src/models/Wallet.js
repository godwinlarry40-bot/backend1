import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  balances: {
    USD: {
      type: Number,
      default: 0,
      min: 0
    },
    EUR: {
      type: Number,
      default: 0,
      min: 0
    },
    GBP: {
      type: Number,
      default: 0,
      min: 0
    },
    BTC: {
      type: Number,
      default: 0,
      min: 0
    },
    ETH: {
      type: Number,
      default: 0,
      min: 0
    },
    USDT: {
      type: Number,
      default: 0,
      min: 0
    },
    USDC: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  totalValueUSD: {
    type: Number,
    default: 0
  },
  lockedBalances: {
    USD: {
      type: Number,
      default: 0,
      min: 0
    },
    BTC: {
      type: Number,
      default: 0,
      min: 0
    },
    ETH: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  walletAddresses: {
    BTC: {
      type: String,
      trim: true
    },
    ETH: {
      type: String,
      trim: true
    },
    USDT: {
      type: String,
      trim: true
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update total value when balances change
walletSchema.pre('save', function(next) {
  // This would be calculated based on current crypto prices
  // For now, we'll use a simple calculation
  const cryptoPrices = {
    BTC: 45000, // Example price
    ETH: 3000,  // Example price
    USDT: 1,
    USDC: 1
  };
  
  let total = this.balances.USD + this.balances.EUR * 1.1 + this.balances.GBP * 1.3;
  
  for (const [currency, balance] of Object.entries(this.balances)) {
    if (cryptoPrices[currency]) {
      total += balance * cryptoPrices[currency];
    }
  }
  
  this.totalValueUSD = total;
  this.lastUpdated = new Date();
  next();
});

// Method to get available balance
walletSchema.methods.getAvailableBalance = function(currency = 'USD') {
  const available = this.balances[currency] || 0;
  const locked = this.lockedBalances[currency] || 0;
  return Math.max(0, available - locked);
};

// Method to check if sufficient funds are available
walletSchema.methods.hasSufficientFunds = function(amount, currency = 'USD') {
  const available = this.getAvailableBalance(currency);
  return available >= amount;
};

// Method to lock funds
walletSchema.methods.lockFunds = function(amount, currency = 'USD') {
  if (!this.hasSufficientFunds(amount, currency)) {
    throw new Error('Insufficient funds');
  }
  
  this.lockedBalances[currency] = (this.lockedBalances[currency] || 0) + amount;
  return this.save();
};

// Method to unlock funds
walletSchema.methods.unlockFunds = function(amount, currency = 'USD') {
  if ((this.lockedBalances[currency] || 0) < amount) {
    throw new Error('Cannot unlock more funds than are locked');
  }
  
  this.lockedBalances[currency] = Math.max(0, (this.lockedBalances[currency] || 0) - amount);
  return this.save();
};

// Method to add funds
walletSchema.methods.addFunds = function(amount, currency = 'USD') {
  this.balances[currency] = (this.balances[currency] || 0) + amount;
  return this.save();
};

// Method to deduct funds
walletSchema.methods.deductFunds = function(amount, currency = 'USD') {
  if (!this.hasSufficientFunds(amount, currency)) {
    throw new Error('Insufficient funds');
  }
  
  this.balances[currency] = Math.max(0, (this.balances[currency] || 0) - amount);
  return this.save();
};

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;