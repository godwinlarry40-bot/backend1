import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
};

export const generateResetToken = (userId) => {
  return jwt.sign(
    { userId, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

export const generateVerificationToken = (userId) => {
  return jwt.sign(
    { userId, type: 'email_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const generate2FASecret = () => {
  return crypto.randomBytes(20).toString('hex');
};

export const verify2FACode = (secret, code) => {
  // In a real implementation, this would use TOTP
  // For now, we'll use a simple verification
  const expectedCode = crypto
    .createHmac('sha256', secret)
    .update(Date.now().toString().slice(0, -3)) // Use time in seconds
    .digest('hex')
    .slice(0, 6);
  
  return code === expectedCode;
};

export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const checkRateLimit = async (ip, endpoint) => {
  // In a real implementation, this would use Redis
  // For now, we'll implement a simple memory-based rate limiter
  const rateLimits = new Map();
  const key = `${ip}:${endpoint}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;
  
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }
  
  const requests = rateLimits.get(key);
  
  // Clean old requests
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }
  
  // Check if rate limit exceeded
  if (requests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      reset: requests[0] + windowMs
    };
  }
  
  // Add current request
  requests.push(now);
  
  return {
    allowed: true,
    remaining: maxRequests - requests.length,
    reset: requests[0] + windowMs
  };
};

export const sanitizeUserData = (user) => {
  const sanitized = user.toObject();
  delete sanitized.password;
  delete sanitized.twoFactorSecret;
  delete sanitized.loginAttempts;
  delete sanitized.lockUntil;
  return sanitized;
};