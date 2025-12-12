import Stripe from 'stripe';
import axios from 'axios';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import logger from '../utils/logger.js';
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from '../config/constants.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class PaymentService {
  
  /**
   * Process credit card deposit
   */
  static async processCreditCardDeposit(userId, amount, currency, cardDetails) {
    try {
      logger.info(`Processing credit card deposit for user ${userId}: ${amount} ${currency}`);
      
      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          userId: userId.toString(),
          type: 'deposit'
        },
        description: `TradePro deposit - User: ${userId}`
      });
      
      // Create pending transaction
      const transaction = await Transaction.create({
        userId,
        type: TRANSACTION_TYPES.DEPOSIT,
        status: TRANSACTION_STATUS.PENDING,
        amount,
        currency,
        netAmount: amount,
        metadata: {
          paymentMethod: 'credit_card',
          stripePaymentIntentId: paymentIntent.id,
          cardLast4: cardDetails.last4,
          cardBrand: cardDetails.brand
        }
      });
      
      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction._id,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      logger.error('Credit card deposit error:', error);
      throw error;
    }
  }
  
  /**
   * Confirm credit card payment
   */
  static async confirmCreditCardPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const userId = paymentIntent.metadata.userId;
        const amount = paymentIntent.amount / 100;
        const currency = paymentIntent.currency.toUpperCase();
        
        // Find the transaction
        const transaction = await Transaction.findOne({
          'metadata.stripePaymentIntentId': paymentIntentId
        });
        
        if (transaction) {
          // Find user's wallet
          let wallet = await Wallet.findOne({ userId });
          if (!wallet) {
            wallet = await Wallet.create({ userId });
          }
          
          // Add funds to wallet
          await wallet.addFunds(amount, currency);
          
          // Update transaction status
          await transaction.markAsCompleted();
          
          logger.info(`Credit card payment confirmed: ${paymentIntentId}`);
          
          return {
            success: true,
            amount,
            currency,
            userId,
            transactionId: transaction._id
          };
        }
      }
      
      return {
        success: false,
        message: 'Payment not confirmed'
      };
    } catch (error) {
      logger.error('Confirm credit card payment error:', error);
      throw error;
    }
  }
  
  /**
   * Process bank transfer deposit
   */
  static async processBankTransfer(userId, amount, currency, bankDetails) {
    try {
      logger.info(`Processing bank transfer for user ${userId}: ${amount} ${currency}`);
      
      // Create pending transaction
      const transaction = await Transaction.create({
        userId,
        type: TRANSACTION_TYPES.DEPOSIT,
        status: TRANSACTION_STATUS.PENDING,
        amount,
        currency,
        netAmount: amount,
        metadata: {
          paymentMethod: 'bank_transfer',
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          reference: `TRADEPRO-${Date.now()}`
        }
      });
      
      // In a real implementation, this would:
      // 1. Generate a unique reference number
      // 2. Provide bank details for user to transfer to
      // 3. Set up webhook to detect incoming transfers
      
      const reference = `TRADEPRO-${transaction._id.toString().slice(-8).toUpperCase()}`;
      
      return {
        success: true,
        transactionId: transaction._id,
        reference,
        instructions: `Please transfer ${amount} ${currency} to our bank account with reference: ${reference}`,
        status: 'awaiting_transfer'
      };
    } catch (error) {
      logger.error('Bank transfer processing error:', error);
      throw error;
    }
  }
  
  /**
   * Process crypto deposit
   */
  static async processCryptoDeposit(userId, currency, amount, txHash) {
    try {
      logger.info(`Processing crypto deposit for user ${userId}: ${amount} ${currency}`);
      
      // Verify the transaction on blockchain
      const txVerified = await this.verifyCryptoTransaction(txHash, currency);
      
      if (!txVerified) {
        throw new Error('Transaction verification failed');
      }
      
      // Find user's wallet
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = await Wallet.create({ userId });
      }
      
      // Add funds to wallet
      await wallet.addFunds(amount, currency);
      
      // Create transaction
      const transaction = await Transaction.create({
        userId,
        type: TRANSACTION_TYPES.DEPOSIT,
        status: TRANSACTION_STATUS.COMPLETED,
        amount,
        currency,
        netAmount: amount,
        txHash,
        metadata: {
          paymentMethod: 'crypto',
          currency,
          amount
        }
      });
      
      logger.info(`Crypto deposit completed: ${txHash}`);
      
      return {
        success: true,
        transactionId: transaction._id,
        amount,
        currency
      };
    } catch (error) {
      logger.error('Crypto deposit processing error:', error);
      throw error;
    }
  }
  
  /**
   * Verify crypto transaction
   */
  static async verifyCryptoTransaction(txHash, currency) {
    try {
      // In a real implementation, this would verify the transaction on the blockchain
      // using services like Blockcypher, Etherscan API, or your own node
      
      // For now, we'll simulate verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock verification - in reality, check:
      // 1. Transaction exists
      // 2. Transaction has sufficient confirmations
      // 3. Amount matches expected
      // 4. Destination address is correct
      
      return true;
    } catch (error) {
      logger.error('Crypto transaction verification error:', error);
      return false;
    }
  }
  
  /**
   * Process crypto withdrawal
   */
  static async processCryptoWithdrawal(userId, amount, currency, toAddress) {
    try {
      logger.info(`Processing crypto withdrawal for user ${userId}: ${amount} ${currency} to ${toAddress}`);
      
      // Find user's wallet
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Check sufficient funds
      if (!wallet.hasSufficientFunds(amount, currency)) {
        throw new Error('Insufficient funds');
      }
      
      // Calculate network fee
      const networkFee = await this.getCryptoNetworkFee(currency);
      const netAmount = amount - networkFee;
      
      if (netAmount <= 0) {
        throw new Error('Amount too small after network fees');
      }
      
      // Lock funds
      await wallet.lockFunds(amount, currency);
      
      // Create pending transaction
      const transaction = await Transaction.create({
        userId,
        type: TRANSACTION_TYPES.WITHDRAWAL,
        status: TRANSACTION_STATUS.PENDING,
        amount,
        currency,
        networkFee,
        netAmount,
        toAddress,
        metadata: {
          paymentMethod: 'crypto',
          currency,
          amount,
          toAddress
        }
      });
      
      // Send crypto transaction (in real implementation)
      const txHash = await this.sendCryptoTransaction(currency, toAddress, netAmount);
      
      if (txHash) {
        // Deduct funds from wallet
        await wallet.deductFunds(amount, currency);
        
        // Unlock funds
        await wallet.unlockFunds(amount, currency);
        
        // Update transaction
        await transaction.markAsCompleted(txHash);
        
        logger.info(`Crypto withdrawal completed: ${txHash}`);
        
        return {
          success: true,
          transactionId: transaction._id,
          txHash,
          amount,
          netAmount,
          networkFee
        };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      logger.error('Crypto withdrawal processing error:', error);
      
      // Unlock funds on error
      try {
        const wallet = await Wallet.findOne({ userId });
        if (wallet) {
          await wallet.unlockFunds(amount, currency);
        }
      } catch (unlockError) {
        logger.error('Failed to unlock funds:', unlockError);
      }
      
      throw error;
    }
  }
  
  /**
   * Get crypto network fee
   */
  static async getCryptoNetworkFee(currency) {
    // In a real implementation, fetch current network fees
    const fees = {
      BTC: 0.0005,
      ETH: 0.005,
      USDT: 1,
      USDC: 1
    };
    
    return fees[currency] || 0.001;
  }
  
  /**
   * Send crypto transaction
   */
  static async sendCryptoTransaction(currency, toAddress, amount) {
    try {
      // In a real implementation, this would:
      // 1. Use a hot wallet service (like Fireblocks, BitGo)
      // 2. Or use your own node with proper security
      // 3. Sign and broadcast the transaction
      
      // For development, return a mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      logger.info(`Mock crypto transaction sent: ${mockTxHash}`);
      
      return mockTxHash;
    } catch (error) {
      logger.error('Send crypto transaction error:', error);
      return null;
    }
  }
  
  /**
   * Get payment methods available for user
   */
  static async getAvailablePaymentMethods(userId, country) {
    // Based on user's country and verification status
    const methods = {
      credit_card: {
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP'],
        minAmount: 10,
        maxAmount: 10000,
        fees: '2.9% + $0.30'
      },
      bank_transfer: {
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP'],
        minAmount: 50,
        maxAmount: 50000,
        fees: '1% (min $5)'
      },
      crypto: {
        enabled: true,
        currencies: ['BTC', 'ETH', 'USDT', 'USDC'],
        minAmount: 0.001, // For BTC
        maxAmount: 1000000,
        fees: 'Network fee only'
      }
    };
    
    // Filter based on country restrictions
    const restrictedCountries = ['IR', 'KP', 'SY', 'CU']; // Example restricted countries
    
    if (restrictedCountries.includes(country)) {
      delete methods.credit_card;
      delete methods.bank_transfer;
    }
    
    return methods;
  }
  
  /**
   * Webhook handler for Stripe events
   */
  static async handleStripeWebhook(event) {
    try {
      const eventType = event.type;
      
      switch (eventType) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          await this.confirmCreditCardPayment(paymentIntent.id);
          break;
          
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          logger.warn(`Payment failed: ${failedPayment.id}`);
          // Update transaction status to failed
          await Transaction.updateOne(
            { 'metadata.stripePaymentIntentId': failedPayment.id },
            { status: TRANSACTION_STATUS.FAILED }
          );
          break;
          
        default:
          logger.debug(`Unhandled Stripe event type: ${eventType}`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Stripe webhook handler error:', error);
      throw error;
    }
  }
};