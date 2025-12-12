import express from 'express';
import {
  getPaymentMethods,
  createCreditCardDeposit,
  createBankTransferDeposit,
  confirmCryptoDeposit,
  processCryptoWithdrawal,
  handleStripeWebhook,
  getTransactionFees
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

// Webhook endpoint (no authentication required)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// All other routes require authentication
router.use(authenticate);

// Get available payment methods
router.get('/methods', getPaymentMethods);

// Get transaction fees
router.get('/fees', getTransactionFees);

// Credit card deposit
router.post('/deposit/credit-card', 
  validate([
    body('amount').isFloat({ min: 10 }),
    body('currency').isIn(['USD', 'EUR', 'GBP']),
    body('cardDetails.cardNumber').isCreditCard(),
    body('cardDetails.expiryMonth').isInt({ min: 1, max: 12 }),
    body('cardDetails.expiryYear').isInt({ min: new Date().getFullYear() }),
    body('cardDetails.cvc').isLength({ min: 3, max: 4 })
  ]),
  createCreditCardDeposit
);

// Bank transfer deposit
router.post('/deposit/bank-transfer',
  validate([
    body('amount').isFloat({ min: 50 }),
    body('currency').isIn(['USD', 'EUR', 'GBP']),
    body('bankDetails.accountHolder').notEmpty(),
    body('bankDetails.accountNumber').notEmpty(),
    body('bankDetails.routingNumber').optional().isNumeric()
  ]),
  createBankTransferDeposit
);

// Crypto deposit confirmation
router.post('/deposit/crypto/confirm',
  validate([
    body('currency').isIn(['BTC', 'ETH', 'USDT', 'USDC']),
    body('amount').isFloat({ min: 0.0001 }),
    body('txHash').isLength({ min: 64, max: 66 })
  ]),
  confirmCryptoDeposit
);

// Crypto withdrawal
router.post('/withdraw/crypto',
  validate([
    body('amount').isFloat({ min: 0.0001 }),
    body('currency').isIn(['BTC', 'ETH', 'USDT', 'USDC']),
    body('walletAddress').notEmpty().isLength({ min: 26, max: 42 })
  ]),
  processCryptoWithdrawal
);

export default router;