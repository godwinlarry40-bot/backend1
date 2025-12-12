import express from 'express';
import mongoose from 'mongoose';
import { checkConnection, testConnection } from '../config/database.js';
import { connectToRedis } from '../config/redis.js';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  // Check MongoDB connection
  const mongoStatus = checkConnection();
  healthCheck.checks.mongodb = {
    status: mongoStatus.isConnected ? 'healthy' : 'unhealthy',
    details: mongoStatus,
    timestamp: new Date().toISOString()
  };

  // Test MongoDB ping
  try {
    const pingResult = await testConnection();
    healthCheck.checks.mongodb.ping = pingResult;
  } catch (error) {
    healthCheck.checks.mongodb.ping = {
      status: 'failed',
      error: error.message
    };
  }

  // Check Redis connection (if configured)
  try {
    const redisClient = await connectToRedis();
    const redisPing = await redisClient.ping();
    healthCheck.checks.redis = {
      status: redisPing === 'PONG' ? 'healthy' : 'unhealthy',
      ping: redisPing,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    healthCheck.checks.redis = {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }

  // Check server memory
  healthCheck.checks.memory = {
    used: process.memoryUsage().heapUsed / 1024 / 1024,
    total: process.memoryUsage().heapTotal / 1024 / 1024,
    rss: process.memoryUsage().rss / 1024 / 1024
  };

  // Determine overall status
  const allHealthy = Object.values(healthCheck.checks).every(
    check => check.status === 'healthy'
  );
  
  healthCheck.status = allHealthy ? 'healthy' : 'unhealthy';

  // Return appropriate status code
  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json(healthCheck);
});

// Detailed database info endpoint
router.get('/database', (req, res) => {
  const connection = mongoose.connection;
  
  const dbInfo = {
    connection: {
      readyState: connection.readyState,
      state: getConnectionState(connection.readyState),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      database: connection.db?.databaseName,
      collections: connection.collections ? 
        Object.keys(connection.collections).length : 0,
      models: Object.keys(connection.models)
    },
    mongoose: {
      version: mongoose.version,
      connections: mongoose.connections.length
    },
    statistics: {
      // Add any custom statistics you want to track
    }
  };

  res.json(dbInfo);
});

// Test database operations
router.get('/test-db', async (req, res) => {
  try {
    const testResults = [];
    
    // Test 1: Ping database
    const pingStart = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - pingStart;
    testResults.push({
      test: 'database_ping',
      status: 'passed',
      duration: `${pingTime}ms`
    });

    // Test 2: List collections
    const collectionsStart = Date.now();
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionsTime = Date.now() - collectionsStart;
    testResults.push({
      test: 'list_collections',
      status: 'passed',
      duration: `${collectionsTime}ms`,
      collections: collections.map(c => c.name)
    });

    // Test 3: Count documents in users collection
    const Users = mongoose.models.User;
    if (Users) {
      const countStart = Date.now();
      const userCount = await Users.countDocuments();
      const countTime = Date.now() - countStart;
      testResults.push({
        test: 'count_users',
        status: 'passed',
        duration: `${countTime}ms`,
        count: userCount
      });
    }

    // Test 4: Insert test document
    const insertStart = Date.now();
    const testCollection = mongoose.connection.db.collection('health_checks');
    const testDoc = {
      timestamp: new Date(),
      server: process.env.NODE_ENV || 'development',
      test: 'health_check'
    };
    const result = await testCollection.insertOne(testDoc);
    const insertTime = Date.now() - insertStart;
    testResults.push({
      test: 'insert_document',
      status: 'passed',
      duration: `${insertTime}ms`,
      insertedId: result.insertedId
    });

    // Test 5: Delete test document
    const deleteStart = Date.now();
    await testCollection.deleteOne({ _id: result.insertedId });
    const deleteTime = Date.now() - deleteStart;
    testResults.push({
      test: 'delete_document',
      status: 'passed',
      duration: `${deleteTime}ms`
    });

    res.json({
      status: 'all_tests_passed',
      tests: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'test_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function
function getConnectionState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

export default router;