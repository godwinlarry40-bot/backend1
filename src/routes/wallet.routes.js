// src/routes/wallet.routes.js
import express from 'express';
import {
  getWallet,
  deposit,
  withdraw,
  getDepositAddress,
  getTransactions,
  getTransaction
} from '../controllers/walletController.js';
import { authenticate } from '../middleware/auth.js';
import {
  validate,
  depositValidation,
  withdrawalValidation
} from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Wallet routes
router.get('/', getWallet);
router.post('/deposit', validate(depositValidation), deposit);
router.post('/withdraw', validate(withdrawalValidation), withdraw);
router.get('/address/:currency', getDepositAddress);

// Transaction routes
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransaction);

// Make sure this line is at the bottom:
export default router;  // ✅ This is the default export