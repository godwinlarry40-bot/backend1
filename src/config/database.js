import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tradepro';

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    // Connection events
    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB connected successfully');
      console.log('✅ MongoDB connected successfully');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err);
      console.error('❌ MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
      console.warn('⚠️ MongoDB disconnected');
    });
    
    // Log connection details
    console.log('📊 MongoDB Connection Details:');
    console.log(`   URI: ${MONGODB_URI.split('@')[1] || MONGODB_URI}`); // Hide credentials
    console.log(`   Database: ${mongoose.connection.db?.databaseName || 'Not connected'}`);
    console.log(`   Host: ${mongoose.connection.host || 'Unknown'}`);
    console.log(`   Port: ${mongoose.connection.port || 'Unknown'}`);
    console.log(`   Ready State: ${getConnectionState(mongoose.connection.readyState)}`);
    
    return mongoose.connection;
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error);
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('🔍 Check if MongoDB is running:');
    console.log('   - For local: run `mongod` or `sudo service mongod start`');
    console.log('   - Check MongoDB service status');
    console.log('   - Verify connection string in .env file');
    throw error;
  }
};

// Helper function to get connection state
function getConnectionState(state) {
  const states = {
    0: '❌ Disconnected',
    1: '✅ Connected',
    2: '🔄 Connecting',
    3: '⚠️ Disconnecting',
    4: '❌ Invalid Credentials'
  };
  return states[state] || `Unknown (${state})`;
}

// Export connection check function
export const checkConnection = () => {
  const state = mongoose.connection.readyState;
  const isConnected = state === 1;
  
  return {
    isConnected,
    state: getConnectionState(state),
    readyState: state,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.db?.databaseName,
    models: Object.keys(mongoose.connection.models),
    collections: mongoose.connection.collections ? 
      Object.keys(mongoose.connection.collections) : []
  };
};

// Test connection function
export const testConnection = async () => {
  try {
    // Try to ping the database
    await mongoose.connection.db.admin().ping();
    return {
      success: true,
      message: '✅ MongoDB connection test successful',
      ping: 'ok'
    };
  } catch (error) {
    return {
      success: false,
      message: '❌ MongoDB connection test failed',
      error: error.message
    };
  }
};