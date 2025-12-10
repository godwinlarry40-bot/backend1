import express from 'express';
import { 
  getWallet, 
  deposit, 
  getTransactions 
} from '../controllers/walletController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getWallet);
router.post('/deposit', authenticate, deposit);
router.get('/transactions', authenticate, getTransactions);

export default router;