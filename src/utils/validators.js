import validator from 'validator';

export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validatePhone = (phone) => {
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
};

export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const score = [
    password.length >= minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar
  ].filter(Boolean).length;
  
  let strength;
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  else strength = 'weak';
  
  return {
    isValid: score >= 3,
    strength,
    requirements: {
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  };
};

export const validateCryptoAddress = (address, currency) => {
  const validators = {
    BTC: (addr) => /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(addr),
    ETH: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr),
    USDT: (addr) => /^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(addr),
    USDC: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr)
  };
  
  const validatorFn = validators[currency.toUpperCase()];
  return validatorFn ? validatorFn(address) : false;
};

export const validateAmount = (amount, min = 0, max = 1000000) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= min && num <= max;
};

export const validateDate = (dateString) => {
  return validator.isDate(dateString, { format: 'YYYY-MM-DD', strictMode: true });
};

export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
};

export const validateURL = (url) => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true
  });
};

export const validateIP = (ip) => {
  return validator.isIP(ip);
};

export const validateJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

export const validateCreditCard = (cardNumber) => {
  // Remove spaces and dashes
  const cleanNumber = cardNumber.replace(/[\s-]/g, '');
  
  // Check if it's a valid number using Luhn algorithm
  return validator.isCreditCard(cleanNumber);
};

export const validateExpiryDate = (expiry) => {
  const [month, year] = expiry.split('/');
  
  if (!month || !year) return false;
  
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  
  const expMonth = parseInt(month, 10);
  const expYear = parseInt(year, 10);
  
  if (expMonth < 1 || expMonth > 12) return false;
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
};

export const validateCVV = (cvv) => {
  return /^[0-9]{3,4}$/.test(cvv);
};