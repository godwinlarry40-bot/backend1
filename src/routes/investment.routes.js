import express from 'express';
import {
  createInvestment,
  getInvestments,
  getInvestment,
  cancelInvestment,
  getInvestmentStats,
  simulateInvestment
} from '../controllers/investmentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, investmentValidation } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Investment routes
router.post('/', validate(investmentValidation), createInvestment);
router.get('/', getInvestments);
router.get('/stats', getInvestmentStats);
router.get('/simulate', simulateInvestment);
router.get('/:id', getInvestment);
router.post('/:id/cancel', cancelInvestment);

export default router;