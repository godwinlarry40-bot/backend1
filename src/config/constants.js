// src/config/constants.js
export const INVESTMENT_PLANS = {
  SHORT_TERM: {
    name: 'Short-Term',
    minDays: 7,
    maxDays: 30,
    managementFee: 0.015, // 1.5%
    performanceFee: 0.10, // 10%
    minInvestment: 100,
    description: 'High liquidity, lower returns',
    color: '#00bcd4'
  },
  MID_TERM: {
    name: 'Mid-Term',
    minDays: 30,
    maxDays: 180,
    managementFee: 0.01, // 1%
    performanceFee: 0.12, // 12%
    minInvestment: 500,
    description: 'Balanced risk and returns',
    color: '#10b981'
  },
  LONG_TERM: {
    name: 'Long-Term',
    minDays: 180,
    maxDays: 720,
    managementFee: 0.0075, // 0.75%
    performanceFee: 0.15, // 15%
    minInvestment: 1000,
    description: 'Long-term growth strategy',
    color: '#8b5cf6'
  }
};

export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  INVESTMENT: 'investment',
  DIVIDEND: 'dividend',
  TRANSFER: 'transfer',
  FEE: 'fee',
  INTEREST: 'interest',
  REFUND: 'refund'
};

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

export const INVESTMENT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  LIQUIDATED: 'liquidated',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
};

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  ANALYST: 'analyst'
};

export const CRYPTO_CURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'ADA', 'SOL', 'XRP', 'DOT', 'DOGE'];

export const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];

export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  BANK_TRANSFER: 'bank_transfer',
  CRYPTO: 'crypto',
  PAYPAL: 'paypal',
  SKRILL: 'skrill',
  NETELLER: 'neteller'
};

export const WITHDRAWAL_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  CRYPTO: 'crypto',
  PAYPAL: 'paypal'
};

export const KYC_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

export const DOCUMENT_TYPES = {
  PASSPORT: 'passport',
  DRIVERS_LICENSE: 'drivers_license',
  NATIONAL_ID: 'national_id',
  RESIDENCE_PERMIT: 'residence_permit',
  UTILITY_BILL: 'utility_bill',
  BANK_STATEMENT: 'bank_statement'
};

export const NOTIFICATION_TYPES = {
  TRANSACTION: 'transaction',
  INVESTMENT: 'investment',
  SECURITY: 'security',
  MARKET: 'market',
  SYSTEM: 'system',
  PROMOTIONAL: 'promotional'
};

export const SECURITY_SETTINGS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  TOKEN_EXPIRY: '7d'
};

export const API_RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 10
  },
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  MARKET_DATA: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 30
  }
};

export const WITHDRAWAL_LIMITS = {
  DAILY: 10000,
  WEEKLY: 50000,
  MONTHLY: 200000,
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 100000
};

export const DEPOSIT_LIMITS = {
  DAILY: 50000,
  WEEKLY: 250000,
  MONTHLY: 1000000,
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 100000
};

export const INVESTMENT_LIMITS = {
  MIN_AMOUNT: 100,
  MAX_AMOUNT: 1000000,
  MAX_ACTIVE_INVESTMENTS: 10
};

export const FEE_STRUCTURE = {
  DEPOSIT: {
    CREDIT_CARD: {
      percentage: 2.9,
      fixed: 0.30,
      min: 1
    },
    BANK_TRANSFER: {
      percentage: 1,
      fixed: 5,
      min: 5
    },
    CRYPTO: {
      percentage: 0,
      fixed: 0,
      min: 0
    }
  },
  WITHDRAWAL: {
    BANK_TRANSFER: {
      percentage: 2,
      fixed: 10,
      min: 10
    },
    CRYPTO: {
      percentage: 0.5,
      fixed: 0,
      min: 0
    }
  },
  TRADING: {
    MAKER: 0.1,
    TAKER: 0.2
  }
};

export const MARKET_DATA_SOURCES = {
  COINGECKO: 'coingecko',
  BINANCE: 'binance',
  COINMARKETCAP: 'coinmarketcap',
  CRYPTOCOMPARE: 'cryptocompare'
};

export const SUPPORTED_LANGUAGES = {
  EN: 'English',
  ES: 'Español',
  FR: 'Français',
  DE: 'Deutsch',
  ZH: '中文',
  JA: '日本語',
  KO: '한국어',
  RU: 'Русский'
};

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

export const COUNTRIES = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil'
};

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const COMPOUNDING_FREQUENCIES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP: 'stop',
  STOP_LIMIT: 'stop_limit'
};

export const TRADE_SIDES = {
  BUY: 'buy',
  SELL: 'sell'
};

// API Endpoints
export const API_ENDPOINTS = {
  V1: '/api/v1',
  AUTH: '/auth',
  WALLET: '/wallet',
  MARKET: '/market',
  INVESTMENTS: '/investments',
  PAYMENT: '/payment',
  USER: '/user',
  ADMIN: '/admin'
};

// Cache keys
export const CACHE_KEYS = {
  MARKET_PRICES: 'market:prices',
  USER_PORTFOLIO: (userId) => `user:${userId}:portfolio`,
  WALLET_BALANCE: (userId) => `user:${userId}:wallet`,
  INVESTMENT_STATS: (userId) => `user:${userId}:investment:stats`,
  TRANSACTION_HISTORY: (userId) => `user:${userId}:transactions`
};

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH001',
  AUTH_TOKEN_EXPIRED: 'AUTH002',
  AUTH_TOKEN_INVALID: 'AUTH003',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH004',
  AUTH_ACCOUNT_LOCKED: 'AUTH005',
  
  // Validation errors
  VALIDATION_FAILED: 'VAL001',
  VALIDATION_INVALID_EMAIL: 'VAL002',
  VALIDATION_INVALID_PASSWORD: 'VAL003',
  VALIDATION_INVALID_PHONE: 'VAL004',
  VALIDATION_INVALID_AMOUNT: 'VAL005',
  
  // Wallet errors
  WALLET_INSUFFICIENT_FUNDS: 'WAL001',
  WALLET_INVALID_ADDRESS: 'WAL002',
  WALLET_TRANSACTION_FAILED: 'WAL003',
  WALLET_WITHDRAWAL_LIMIT_EXCEEDED: 'WAL004',
  
  // Investment errors
  INVESTMENT_MIN_AMOUNT: 'INV001',
  INVESTMENT_MAX_ACTIVE: 'INV002',
  INVESTMENT_PLAN_NOT_AVAILABLE: 'INV003',
  INVESTMENT_CANNOT_CANCEL: 'INV004',
  
  // Payment errors
  PAYMENT_PROCESSING_FAILED: 'PAY001',
  PAYMENT_METHOD_NOT_SUPPORTED: 'PAY002',
  PAYMENT_INSUFFICIENT_FUNDS: 'PAY003',
  
  // Market errors
  MARKET_DATA_UNAVAILABLE: 'MAR001',
  MARKET_API_LIMIT_EXCEEDED: 'MAR002',
  
  // System errors
  SYSTEM_ERROR: 'SYS001',
  DATABASE_ERROR: 'SYS002',
  EXTERNAL_API_ERROR: 'SYS003',
  
  // User errors
  USER_NOT_FOUND: 'USR001',
  USER_ALREADY_EXISTS: 'USR002',
  USER_KYC_REQUIRED: 'USR003',
  USER_SUSPENDED: 'USR004'
};

// Success codes
export const SUCCESS_CODES = {
  // General success
  SUCCESS: 'SUC001',
  CREATED: 'SUC002',
  UPDATED: 'SUC003',
  DELETED: 'SUC004',
  
  // Auth success
  REGISTERED: 'SUC101',
  LOGGED_IN: 'SUC102',
  LOGGED_OUT: 'SUC103',
  PASSWORD_CHANGED: 'SUC104',
  
  // Wallet success
  DEPOSIT_INITIATED: 'SUC201',
  WITHDRAWAL_INITIATED: 'SUC202',
  TRANSACTION_COMPLETED: 'SUC203',
  
  // Investment success
  INVESTMENT_CREATED: 'SUC301',
  INVESTMENT_COMPLETED: 'SUC302',
  INVESTMENT_CANCELLED: 'SUC303',
  
  // Payment success
  PAYMENT_PROCESSED: 'SUC401'
};

// Default values
export const DEFAULTS = {
  PAGINATION: {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100
  },
  SORTING: {
    FIELD: 'createdAt',
    ORDER: 'desc'
  },
  CACHE_TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400 // 24 hours
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000 // 1 second
  }
};

// Environment
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

// Log levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// HTTP Status codes mapped to our error codes
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Email templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  DEPOSIT_CONFIRMATION: 'deposit_confirmation',
  WITHDRAWAL_CONFIRMATION: 'withdrawal_confirmation',
  INVESTMENT_CREATED: 'investment_created',
  INVESTMENT_COMPLETED: 'investment_completed',
  SECURITY_ALERT: 'security_alert',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  NEWSLETTER: 'newsletter'
};

// Verification types
export const VERIFICATION_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  TWO_FACTOR: 'two_factor',
  KYC: 'kyc'
};

// Two-factor methods
export const TWO_FACTOR_METHODS = {
  AUTHENTICATOR: 'authenticator',
  SMS: 'sms',
  EMAIL: 'email'
};

// Webhook events
export const WEBHOOK_EVENTS = {
  DEPOSIT_SUCCESS: 'deposit.success',
  DEPOSIT_FAILED: 'deposit.failed',
  WITHDRAWAL_SUCCESS: 'withdrawal.success',
  WITHDRAWAL_FAILED: 'withdrawal.failed',
  INVESTMENT_CREATED: 'investment.created',
  INVESTMENT_COMPLETED: 'investment.completed',
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  KYC_SUBMITTED: 'kyc.submitted',
  KYC_APPROVED: 'kyc.approved',
  KYC_REJECTED: 'kyc.rejected'
};

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  MAX_FILES_PER_UPLOAD: 5
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'DD MMM YYYY, hh:mm A',
  API: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  SHORT: 'DD/MM/YYYY',
  LONG: 'dddd, MMMM Do YYYY, h:mm:ss a'
};

// Currency symbols
export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  BTC: '₿',
  ETH: 'Ξ'
};

// Network names
export const NETWORK_NAMES = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BSC: 'Binance Smart Chain',
  POLYGON: 'Polygon',
  SOLANA: 'Solana',
  ARBITRUM: 'Arbitrum',
  OPTIMISM: 'Optimism',
  AVALANCHE: 'Avalanche'
};

// API Response messages
export const RESPONSE_MESSAGES = {
  // Success messages
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  
  // Auth messages
  REGISTERED: 'Registration successful',
  LOGGED_IN: 'Login successful',
  LOGGED_OUT: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  
  // Wallet messages
  DEPOSIT_INITIATED: 'Deposit initiated successfully',
  WITHDRAWAL_INITIATED: 'Withdrawal initiated successfully',
  BALANCE_UPDATED: 'Balance updated successfully',
  
  // Investment messages
  INVESTMENT_CREATED: 'Investment created successfully',
  INVESTMENT_CANCELLED: 'Investment cancelled successfully',
  INVESTMENT_COMPLETED: 'Investment completed successfully',
  
  // Error messages
  INTERNAL_ERROR: 'An internal server error occurred',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  VALIDATION_ERROR: 'Validation failed',
  RATE_LIMITED: 'Too many requests, please try again later'
};

// Export all constants
export default {
  INVESTMENT_PLANS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  INVESTMENT_STATUS,
  USER_ROLES,
  CRYPTO_CURRENCIES,
  FIAT_CURRENCIES,
  PAYMENT_METHODS,
  WITHDRAWAL_METHODS,
  KYC_STATUS,
  DOCUMENT_TYPES,
  NOTIFICATION_TYPES,
  SECURITY_SETTINGS,
  API_RATE_LIMITS,
  WITHDRAWAL_LIMITS,
  DEPOSIT_LIMITS,
  INVESTMENT_LIMITS,
  FEE_STRUCTURE,
  MARKET_DATA_SOURCES,
  SUPPORTED_LANGUAGES,
  THEMES,
  TIMEZONES,
  COUNTRIES,
  RISK_LEVELS,
  COMPOUNDING_FREQUENCIES,
  ORDER_TYPES,
  TRADE_SIDES,
  API_ENDPOINTS,
  CACHE_KEYS,
  ERROR_CODES,
  SUCCESS_CODES,
  DEFAULTS,
  ENVIRONMENTS,
  LOG_LEVELS,
  HTTP_STATUS,
  EMAIL_TEMPLATES,
  VERIFICATION_TYPES,
  TWO_FACTOR_METHODS,
  WEBHOOK_EVENTS,
  UPLOAD_LIMITS,
  DATE_FORMATS,
  CURRENCY_SYMBOLS,
  NETWORK_NAMES,
  RESPONSE_MESSAGES
};