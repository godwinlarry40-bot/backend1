import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id || 'anonymous',
    userAgent: req.get('user-agent')
  });
  
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }
  
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID';
  }
  
  if (err.code === 11000) {
    statusCode = 409; // ✅ CHANGED: 409 Conflict is more appropriate for duplicates
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate value for field: ${field}`;
  }
  
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Not authorized';
  }
  
  // ✅ SECURITY FIX: Always hide stack trace in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  const errorResponse = {
    success: false,
    message: isProduction && statusCode === 500 ? 'Internal Server Error' : message,
    statusCode,
    ...(!isProduction && { stack: err.stack })
  };
  
  // ✅ Optional: Include validation errors in development
  if (!isProduction && err.name === 'ValidationError' && err.errors) {
    errorResponse.errors = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;