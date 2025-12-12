import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController.js';
import {
  authenticate,
  authorize
} from '../middleware/auth.js';
import {
  validate,
  registerValidation,
  loginValidation
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.post('/password/reset/request', requestPasswordReset);
router.post('/password/reset', resetPassword);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password/change', authenticate, changePassword);

// Admin routes
// router.get('/users', authenticate, authorize('admin'), getUsers);

export default router;