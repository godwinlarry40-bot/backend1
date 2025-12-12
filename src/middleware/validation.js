import { body, param, validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  };
};

// User validation rules
export const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number')
];

export const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Wallet validation rules
export const depositValidation = [
  body('amount')
    .isFloat({ min: 10 })
    .withMessage('Minimum deposit amount is $10'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('paymentMethod')
    .isIn(['credit_card', 'bank_transfer', 'crypto'])
    .withMessage('Invalid payment method')
];

export const withdrawalValidation = [
  body('amount')
    .isFloat({ min: 10 })
    .withMessage('Minimum withdrawal amount is $10'),
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required')
    .isLength({ min: 26, max: 35 })
    .withMessage('Invalid wallet address format'),
  body('currency')
    .isIn(['BTC', 'ETH', 'USDT', 'USDC'])
    .withMessage('Invalid cryptocurrency')
];

// Investment validation rules
export const investmentValidation = [
  body('plan')
    .isIn(['short', 'mid', 'long'])
    .withMessage('Invalid investment plan'),
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Minimum investment amount is $100'),
  body('duration')
    .isInt({ min: 7, max: 720 })
    .withMessage('Duration must be between 7 and 720 days')
];