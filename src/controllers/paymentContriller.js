import { PaymentService } from '../services/paymentService.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';

export const getPaymentMethods = async (req, res) => {
  try {
    const { country = 'US' } = req.query;
    
    const methods = await PaymentService.getAvailablePaymentMethods(req.user._id, country);
    
    res.status(200).json({
      success: true,
      data: { methods }
    });
  } catch (error) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
};

export const createCreditCardDeposit = async (req, res) => {
  try {
    const { amount, currency, cardDetails } = req.body;
    
    const result = await PaymentService.processCreditCardDeposit(
      req.user._id,
      amount,
      currency,
      cardDetails
    );
    
    res.status(200).json({
      success: true,
      message: 'Credit card deposit initiated',
      data: result
    });
  } catch (error) {
    logger.error('Create credit card deposit error:', error);
    
    let statusCode = 500;
    let message = 'Failed to process credit card deposit';
    
    if (error.type === 'StripeCardError') {
      statusCode = 400;
      message = error.message;
    }
    
    res.status(statusCode).json({
      success: false,
      message
    });
  }
};

export const createBankTransferDeposit = async (req, res) => {
  try {
    const { amount, currency, bankDetails } = req.body;
    
    const result = await PaymentService.processBankTransfer(
      req.user._id,
      amount,
      currency,
      bankDetails
    );
    
    res.status(200).json({
      success: true,
      message: 'Bank transfer instructions generated',
      data: result
    });
  } catch (error) {
    logger.error('Create bank transfer deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bank transfer'
    });
  }
};

export const confirmCryptoDeposit = async (req, res) => {
  try {
    const { currency, amount, txHash } = req.body;
    
    const result = await PaymentService.processCryptoDeposit(
      req.user._id,
      currency,
      amount,
      txHash
    );
    
    res.status(200).json({
      success: true,
      message: 'Crypto deposit confirmed',
      data: result
    });
  } catch (error) {
    logger.error('Confirm crypto deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm crypto deposit'
    });
  }
};

export const processCryptoWithdrawal = async (req, res) => {
  try {
    const { amount, currency, walletAddress } = req.body;
    
    const result = await PaymentService.processCryptoWithdrawal(
      req.user._id,
      amount,
      currency,
      walletAddress
    );
    
    res.status(200).json({
      success: true,
      message: 'Crypto withdrawal initiated',
      data: result
    });
  } catch (error) {
    logger.error('Process crypto withdrawal error:', error);
    
    let statusCode = 500;
    let message = 'Failed to process withdrawal';
    
    if (error.message === 'Insufficient funds') {
      statusCode = 400;
      message = error.message;
    } else if (error.message === 'Amount too small after network fees') {
      statusCode = 400;
      message = error.message;
    }
    
    res.status(statusCode).json({
      success: false,
      message
    });
  }
};

export const handleStripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Process the event
    await PaymentService.handleStripeWebhook(event);
    
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

export const getTransactionFees = async (req, res) => {
  try {
    const { amount, currency, method } = req.query;
    
    const fees = {
      credit_card: {
        percentage: 2.9,
        fixed: 0.30,
        minAmount: 10
      },
      bank_transfer: {
        percentage: 1,
        fixed: 5,
        minAmount: 50
      },
      crypto: {
        networkFee: await PaymentService.getCryptoNetworkFee(currency),
        platformFee: 0
      }
    };
    
    const methodFees = fees[method];
    if (!methodFees) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }
    
    let totalFee = 0;
    
    if (method === 'crypto') {
      totalFee = methodFees.networkFee;
    } else {
      totalFee = (amount * methodFees.percentage / 100) + methodFees.fixed;
      if (totalFee < methodFees.fixed) {
        totalFee = methodFees.fixed;
      }
    }
    
    const netAmount = amount - totalFee;
    
    res.status(200).json({
      success: true,
      data: {
        amount,
        currency,
        method,
        fees: {
          total: totalFee,
          breakdown: methodFees
        },
        netAmount
      }
    });
  } catch (error) {
    logger.error('Get transaction fees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate fees'
    });
  }
};