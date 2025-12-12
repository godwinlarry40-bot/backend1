#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tradepro';

console.log('🔍 MongoDB Connection Diagnostic Tool\n');
console.log('📊 Configuration:');
console.log(`   URI: ${MONGODB_URI}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

// Helper function to get connection state
function getConnectionState(state) {
  const states = {
    0: '❌ Disconnected',
    1: '✅ Connected',
    2: '🔄 Connecting',
    3: '⚠️ Disconnecting',
    99: '📡 Testing connection...'
  };
  return states[state] || `Unknown (${state})`;
}

async function diagnoseConnection() {
  console.log('\n📡 Testing MongoDB connection...\n');
  
  try {
    // Test connection without connecting
    const testStart = Date.now();
    
    // Create a temporary connection for testing
    const tempConnection = mongoose.createConnection(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    tempConnection.on('error', (err) => {
      console.log('❌ Connection error:', err.message);
    });
    
    tempConnection.on('connected', () => {
      console.log('✅ Successfully connected to MongoDB!');
    });
    
    // Try to connect
    await tempConnection.asPromise();
    
    const testEnd = Date.now();
    const testDuration = testEnd - testStart;
    
    console.log(`\n✅ Connection successful!`);
    console.log(`   Duration: ${testDuration}ms`);
    console.log(`   Database: ${tempConnection.db?.databaseName}`);
    console.log(`   Host: ${tempConnection.host}`);
    console.log(`   Port: ${tempConnection.port}`);
    
    // List collections
    try {
      const collections = await tempConnection.db.listCollections().toArray();
      console.log(`\n📁 Collections (${collections.length}):`);
      collections.forEach((collection, index) => {
        console.log(`   ${index + 1}. ${collection.name}`);
      });
    } catch (error) {
      console.log(`\n⚠️ Could not list collections: ${error.message}`);
    }
    
    // Close temporary connection
    await tempConnection.close();
    
    return {
      success: true,
      duration: testDuration,
      database: tempConnection.db?.databaseName,
      host: tempConnection.host,
      port: tempConnection.port
    };
    
  } catch (error) {
    console.log(`\n❌ Connection failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Check if MongoDB is running:');
    console.log('      - For macOS: `brew services list | grep mongodb`');
    console.log('      - For Linux: `sudo systemctl status mongod`');
    console.log('      - For Windows: Check MongoDB service in Services');
    console.log('   2. Try connecting with MongoDB Compass');
    console.log('   3. Check if the port is correct (default: 27017)');
    console.log('   4. Verify connection string format');
    console.log('   5. Check firewall settings');
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('\n💡 This usually means MongoDB is not running or not accessible');
    } else if (error.name === 'MongoNetworkError') {
      console.log('\n💡 Network issue - check if MongoDB is running and accessible');
    } else if (error.name === 'MongoParseError') {
      console.log('\n💡 Connection string format error - check your MONGODB_URI');
    }
    
    return {
      success: false,
      error: error.message,
      name: error.name
    };
  }
}

// Run diagnostics
diagnoseConnection().then(result => {
  if (result.success) {
    console.log('\n🎉 All checks passed! Your MongoDB connection is working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Connection test failed. Please check the issues above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});