import app from './app.js';
import { connectToDatabase, checkConnection } from './config/database.js';
import { connectToRedis } from './config/redis.js';
import logger from './utils/logger.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;

// Display startup banner
console.log(`
╔══════════════════════════════════════════╗
║         TradePro Backend Server          ║
║         Starting up...                   ║
╚══════════════════════════════════════════╝
`);

console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Port:', PORT);
console.log('⏰ Time:', new Date().toLocaleString());

const startServer = async () => {
  try {
    console.log('\n🔗 Connecting to services...\n');
    
    // Connect to MongoDB
    console.log('📦 MongoDB: Connecting...');
    await connectToDatabase();
    
    // Display MongoDB connection info
    const dbInfo = checkConnection();
    console.log(`   Status: ${dbInfo.state}`);
    console.log(`   Database: ${dbInfo.database || 'Not connected'}`);
    console.log(`   Host: ${dbInfo.host || 'Unknown'}`);
    console.log(`   Port: ${dbInfo.port || 'Unknown'}`);
    
    if (dbInfo.isConnected) {
      console.log('✅ MongoDB connection established\n');
    } else {
      console.log('❌ MongoDB connection failed\n');
      throw new Error('Failed to connect to MongoDB');
    }
    
    // Connect to Redis (if configured)
    if (process.env.REDIS_URL) {
      console.log('🗄️  Redis: Connecting...');
      try {
        const redisClient = await connectToRedis();
        const ping = await redisClient.ping();
        console.log(`   Status: ✅ Connected (Ping: ${ping})`);
        console.log('✅ Redis connection established\n');
      } catch (redisError) {
        console.log(`   Status: ⚠️  Not connected (${redisError.message})`);
        console.log('⚠️  Redis connection failed (optional)\n');
      }
    } else {
      console.log('🗄️  Redis: Not configured (optional)\n');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log('🚀 Server started successfully!\n');
      console.log('🌐 Server Information:');
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   API Base: http://localhost:${PORT}/api/v1`);
      console.log(`   Uptime: ${process.uptime().toFixed(2)} seconds`);
      
      console.log('\n📊 Available API Endpoints:');
      console.log('   GET  /api/health          - Health check');
      console.log('   GET  /api/health/database - Database info');
      console.log('   POST /api/v1/auth/login   - User login');
      console.log('   POST /api/v1/auth/register - User registration');
      console.log('   GET  /api/v1/market/prices - Live crypto prices');
      console.log('   GET  /api/v1/wallet        - Get wallet balance');
      
      console.log('\n🔒 Server is ready to accept connections!\n');
      console.log('📝 Logs are being written to:');
      console.log('   - Console output');
      console.log('   - logs/combined.log');
      console.log('   - logs/error.log');
      
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`MongoDB connected to: ${dbInfo.database}`);
    });
    
    // Monitor connection status periodically
    setInterval(() => {
      const status = checkConnection();
      if (!status.isConnected) {
        logger.warn('MongoDB connection lost! Attempting to reconnect...');
        console.warn('⚠️  MongoDB connection lost!');
      }
    }, 30000); // Check every 30 seconds
    
  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('   1. Check if MongoDB is running');
    console.error('   2. Verify MONGODB_URI in .env file');
    console.error('   3. Check network connectivity');
    console.error('   4. Look at error logs for details\n');
    
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  
  const dbInfo = checkConnection();
  if (dbInfo.isConnected) {
    console.log('📦 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  
  const dbInfo = checkConnection();
  if (dbInfo.isConnected) {
    console.log('📦 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  logger.error('Uncaught Exception:', error);
  
  const dbInfo = checkConnection();
  console.log('📊 Last known DB status:', dbInfo.state);
  
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  const dbInfo = checkConnection();
  console.log('📊 Last known DB status:', dbInfo.state);
  
  process.exit(1);
});

// Start the server
startServer();