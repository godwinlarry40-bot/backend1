import redis from 'redis';
import logger from '../utils/logger.js';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

// Redis client instances
let redisClient = null;
let pubClient = null;
let subClient = null;

// Redis connection options
const redisOptions = {
  url: REDIS_URL,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis max retries reached');
      return undefined;
    }
    
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

// Add password if provided
if (REDIS_PASSWORD) {
  redisOptions.password = REDIS_PASSWORD;
}

/**
 * Connect to Redis
 * @returns {Promise<Object>} Redis client
 */
export const connectToRedis = async () => {
  try {
    // Create main Redis client
    redisClient = redis.createClient(redisOptions);
    
    // Create pub/sub clients
    pubClient = redis.createClient(redisOptions);
    subClient = redis.createClient(redisOptions);
    
    // Event handlers for main client
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });
    
    redisClient.on('end', () => {
      logger.warn('Redis client disconnected');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
    
    // Event handlers for pub/sub clients
    pubClient.on('error', (error) => {
      logger.error('Redis pub client error:', error);
    });
    
    subClient.on('error', (error) => {
      logger.error('Redis sub client error:', error);
    });
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      redisClient.on('ready', resolve);
      redisClient.on('error', reject);
    });
    
    logger.info('Redis connection established successfully');
    
    return {
      redisClient,
      pubClient,
      subClient
    };
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

/**
 * Get Redis client instance
 * @returns {Object} Redis client
 */
export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectToRedis first.');
  }
  return redisClient;
};

/**
 * Get Redis pub client instance
 * @returns {Object} Redis pub client
 */
export const getPubClient = () => {
  if (!pubClient) {
    throw new Error('Redis pub client not initialized. Call connectToRedis first.');
  }
  return pubClient;
};

/**
 * Get Redis sub client instance
 * @returns {Object} Redis sub client
 */
export const getSubClient = () => {
  if (!subClient) {
    throw new Error('Redis sub client not initialized. Call connectToRedis first.');
  }
  return subClient;
};

/**
 * Set value in Redis with optional expiration
 * @param {string} key - Redis key
 * @param {any} value - Value to store
 * @param {number} expireIn - Expiration in seconds (optional)
 * @returns {Promise<string>} Redis response
 */
export const setRedis = async (key, value, expireIn = null) => {
  try {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (expireIn) {
      return new Promise((resolve, reject) => {
        redisClient.setex(key, expireIn, stringValue, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        redisClient.set(key, stringValue, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    }
  } catch (error) {
    logger.error('Redis set error:', { key, error: error.message });
    throw error;
  }
};

/**
 * Get value from Redis
 * @param {string} key - Redis key
 * @returns {Promise<any>} Retrieved value
 */
export const getRedis = async (key) => {
  try {
    return new Promise((resolve, reject) => {
      redisClient.get(key, (error, result) => {
        if (error) {
          reject(error);
        } else if (result === null) {
          resolve(null);
        } else {
          // Try to parse JSON, otherwise return string
          try {
            resolve(JSON.parse(result));
          } catch {
            resolve(result);
          }
        }
      });
    });
  } catch (error) {
    logger.error('Redis get error:', { key, error: error.message });
    throw error;
  }
};

/**
 * Delete key from Redis
 * @param {string} key - Redis key
 * @returns {Promise<number>} Number of keys deleted
 */
export const delRedis = async (key) => {
  try {
    return new Promise((resolve, reject) => {
      redisClient.del(key, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  } catch (error) {
    logger.error('Redis delete error:', { key, error: error.message });
    throw error;
  }
};

/**
 * Check if key exists in Redis
 * @param {string} key - Redis key
 * @returns {Promise<boolean>} Whether key exists
 */
export const existsRedis = async (key) => {
  try {
    return new Promise((resolve, reject) => {
      redisClient.exists(key, (error, result) => {
        if (error) reject(error);
        else resolve(result === 1);
      });
    });
  } catch (error) {
    logger.error('Redis exists error:', { key, error: error.message });
    throw error;
  }
};

/**
 * Set hash field in Redis
 * @param {string} key - Redis key
 * @param {string} field - Hash field
 * @param {any} value - Value to store
 * @returns {Promise<number>} Redis response
 */
export const hsetRedis = async (key, field, value) => {
  try {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    return new Promise((resolve, reject) => {
      redisClient.hset(key, field, stringValue, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  } catch (error) {
    logger.error('Redis hset error:', { key, field, error: error.message });
    throw error;
  }
};

/**
 * Get hash field from Redis
 * @param {string} key - Redis key
 * @param {string} field - Hash field
 * @returns {Promise<any>} Retrieved value
 */
export const hgetRedis = async (key, field) => {
  try {
    return new Promise((resolve, reject) => {
      redisClient.hget(key, field, (error, result) => {
        if (error) {
          reject(error);
        } else if (result === null) {
          resolve(null);
        } else {
          // Try to parse JSON, otherwise return string
          try {
            resolve(JSON.parse(result));
          } catch {
            resolve(result);
          }
        }
      });
    });
  } catch (error) {
    logger.error('Redis hget error:', { key, field, error: error.message });
    throw error;
  }
};

/**
 * Get all hash fields from Redis
 * @param {string} key - Redis key
 * @returns {Promise<Object>} All hash fields
 */
export const hgetallRedis = async (key) => {
  try {
    return new Promise((resolve, reject) => {
      redisClient.hgetall(key, (error, result) => {
        if (error) {
          reject(error);
        } else if (!result) {
          resolve({});
        } else {
          // Try to parse JSON values
          const parsedResult = {};
          for (const [field, value] of Object.entries(result)) {
            try {
              parsedResult[field] = JSON.parse(value);
            } catch {
              parsedResult[field] = value;
            }
          }
          resolve(parsedResult);
        }
      });
    });
  } catch (error) {
    logger.error('Redis hgetall error:', { key, error: error.message });
    throw error;
  }
};

/**
 * Increment value in Redis
 * @param {string} key - Redis key
 * @param {number} increment - Increment amount (default: 1)
 * @returns {Promise<number>} New value
 */
export const incrRedis = async (key, increment = 1) => {
  try {
    if (increment === 1) {
      return new Promise((resolve, reject) => {
        redisClient.incr(key, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        redisClient.incrby(key, increment, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    }
  } catch (error) {
    logger.error('Redis incr error:', { key, increment, error: error.message });
    throw error;
  }
};

/**
 * Decrement value in Redis
 * @param {string} key - Redis key
 * @param {number} decrement - Decrement amount (default: 1)
 * @returns {Promise<number>} New value
 */
export const decrRedis = async (key, decrement = 1) => {
  try {
    if (decrement === 1) {
      return new Promise((resolve, reject) => {
        redisClient.decr(key, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        redisClient.decrby(key, decrement, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    }
  } catch (error) {
    logger.error('Redis decr error:', { key, decrement, error: error.message });
    throw error;
  }
};

/**
 * Add value to sorted set
 * @param {string} key - Redis key
 * @param {number} score - Score for sorting
 * @param {string} value - Value to add
 * @returns {Promise<number>} Redis response
 */
export const zaddRedis = async (key, score, value) => {
  try {
    return new Promise((resolve, reject) => {
      redisClient.zadd(key, score, value, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  } catch (error) {
    logger.error('Redis zadd error:', { key, score, value, error: error.message });
    throw error;
  }
};

/**
 * Get range from sorted set
 * @param {string} key - Redis key
 * @param {number} start - Start index
 * @param {number} stop - Stop index
 * @param {boolean} withScores - Whether to include scores
 * @returns {Promise<Array>} Sorted set range
 */
export const zrangeRedis = async (key, start, stop, withScores = false) => {
  try {
    const args = [key, start, stop];
    if (withScores) args.push('WITHSCORES');
    
    return new Promise((resolve, reject) => {
      redisClient.zrange(args, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  } catch (error) {
    logger.error('Redis zrange error:', { key, start, stop, error: error.message });
    throw error;
  }
};

/**
 * Publish message to Redis channel
 * @param {string} channel - Channel name
 * @param {any} message - Message to publish
 * @returns {Promise<number>} Number of subscribers that received the message
 */
export const publishRedis = async (channel, message) => {
  try {
    const stringMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
    
    return new Promise((resolve, reject) => {
      pubClient.publish(channel, stringMessage, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  } catch (error) {
    logger.error('Redis publish error:', { channel, error: error.message });
    throw error;
  }
};

/**
 * Subscribe to Redis channel
 * @param {string} channel - Channel name
 * @param {Function} callback - Callback function for messages
 * @returns {Promise<void>}
 */
export const subscribeRedis = async (channel, callback) => {
  try {
    subClient.subscribe(channel);
    
    subClient.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch {
          callback(message);
        }
      }
    });
    
    logger.info(`Subscribed to Redis channel: ${channel}`);
  } catch (error) {
    logger.error('Redis subscribe error:', { channel, error: error.message });
    throw error;
  }
};

/**
 * Close Redis connections
 * @returns {Promise<void>}
 */
export const closeRedisConnections = async () => {
  try {
    if (redisClient) {
      await new Promise((resolve) => {
        redisClient.quit(() => {
          logger.info('Redis client closed');
          resolve();
        });
      });
    }
    
    if (pubClient) {
      await new Promise((resolve) => {
        pubClient.quit(() => {
          logger.info('Redis pub client closed');
          resolve();
        });
      });
    }
    
    if (subClient) {
      await new Promise((resolve) => {
        subClient.quit(() => {
          logger.info('Redis sub client closed');
          resolve();
        });
      });
    }
    
    logger.info('All Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
    throw error;
  }
};

/**
 * Redis health check
 * @returns {Promise<Object>} Health status
 */
export const checkRedisHealth = async () => {
  try {
    const pingResponse = await new Promise((resolve, reject) => {
      redisClient.ping((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    
    const info = await new Promise((resolve, reject) => {
      redisClient.info((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    
    return {
      status: 'healthy',
      ping: pingResponse === 'PONG',
      info: info.split('\r\n').slice(0, 10).join('\n') // First 10 lines of info
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      ping: false,
      error: error.message
    };
  }
};

/**
 * Cache middleware for Express routes
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (duration = 60) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cachedData = await getRedis(key);
      
      if (cachedData) {
        logger.debug(`Cache hit: ${key}`);
        return res.json(cachedData);
      }
      
      // Store original send function
      const originalSend = res.json;
      
      // Override send function to cache response
      res.json = function(data) {
        // Cache the response
        setRedis(key, data, duration).catch(error => {
          logger.error('Cache set error:', error);
        });
        
        // Call original send
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Rate limiter using Redis
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100, // Limit each IP to 100 requests per windowMs
    keyPrefix = 'rate_limit:',
    message = 'Too many requests, please try again later.'
  } = options;
  
  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${keyPrefix}${ip}`;
    
    try {
      // Get current count
      const current = await getRedis(key) || 0;
      
      if (current >= maxRequests) {
        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Increment count
      await incrRedis(key);
      
      // Set expiration if this is the first request
      if (current === 0) {
        await new Promise((resolve, reject) => {
          redisClient.expire(key, Math.ceil(windowMs / 1000), (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
      
      // Add headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - current - 1,
        'X-RateLimit-Reset': Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000)
      });
      
      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // If Redis fails, allow the request
      next();
    }
  };
};