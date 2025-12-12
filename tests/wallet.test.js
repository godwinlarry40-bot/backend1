import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Wallet from '../src/models/Wallet.js';
import Transaction from '../src/models/Transaction.js';

let mongoServer;
let server;
let authToken;
let userId;

beforeAll(async () => {
  // Create in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  // Start server
  server = app.listen(0);
});

afterAll(async () => {
  // Close server and database
  await server.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear database
  await User.deleteMany({});
  await Wallet.deleteMany({});
  await Transaction.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'wallet@example.com',
    password: 'Password123!',
    firstName: 'Wallet',
    lastName: 'User'
  });
  
  // Create wallet for user
  await Wallet.create({
    userId: user._id,
    balances: {
      USD: 1000,
      BTC: 0.1
    }
  });
  
  // Generate auth token
  authToken = user.generateAuthToken();
  userId = user._id;
});

describe('Wallet API', () => {
  describe('GET /api/v1/wallet', () => {
    it('should get wallet balance', async () => {
      const response = await request(server)
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wallet).toHaveProperty('balances');
      expect(response.body.data.wallet.balances).toHaveProperty('USD', 1000);
      expect(response.body.data.wallet.balances).toHaveProperty('BTC', 0.1);
    });
    
    it('should create wallet if not exists', async () => {
      // Create new user without wallet
      const newUser = await User.create({
        email: 'nowallet@example.com',
        password: 'Password123!',
        firstName: 'No',
        lastName: 'Wallet'
      });
      
      const newToken = newUser.generateAuthToken();
      
      const response = await request(server)
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${newToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wallet).toHaveProperty('balances');
      expect(response.body.data.wallet.balances.USD).toBe(0);
    });
  });
  
  describe('POST /api/v1/wallet/deposit', () => {
    it('should initiate deposit', async () => {
      const depositData = {
        amount: 500,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };
      
      const response = await request(server)
        .post('/api/v1/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(depositData);
      
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('status', 'pending');
    });
    
    it('should validate deposit amount', async () => {
      const depositData = {
        amount: 5, // Below minimum
        currency: 'USD',
        paymentMethod: 'credit_card'
      };
      
      const response = await request(server)
        .post('/api/v1/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(depositData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/v1/wallet/withdraw', () => {
    it('should initiate withdrawal with sufficient funds', async () => {
      const withdrawalData = {
        amount: 100,
        currency: 'USD',
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      };
      
      const response = await request(server)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawalData);
      
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('status', 'pending');
    });
    
    it('should not withdraw with insufficient funds', async () => {
      const withdrawalData = {
        amount: 2000, // More than balance
        currency: 'USD',
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      };
      
      const response = await request(server)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawalData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient funds');
    });
    
    it('should validate wallet address', async () => {
      const withdrawalData = {
        amount: 100,
        currency: 'USD',
        walletAddress: 'invalid-address'
      };
      
      const response = await request(server)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawalData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/wallet/address/:currency', () => {
    it('should get deposit address for currency', async () => {
      const response = await request(server)
        .get('/api/v1/wallet/address/BTC')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('currency', 'BTC');
    });
    
    it('should generate new address if not exists', async () => {
      // Check wallet has no ETH address initially
      const wallet = await Wallet.findOne({ userId });
      expect(wallet.walletAddresses.ETH).toBeUndefined();
      
      const response = await request(server)
        .get('/api/v1/wallet/address/ETH')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isNew', true);
      
      // Verify address was saved
      const updatedWallet = await Wallet.findOne({ userId });
      expect(updatedWallet.walletAddresses.ETH).toBeDefined();
    });
  });
  
  describe('GET /api/v1/wallet/transactions', () => {
    beforeEach(async () => {
      // Create some test transactions
      await Transaction.create([
        {
          userId,
          type: 'deposit',
          status: 'completed',
          amount: 1000,
          currency: 'USD',
          netAmount: 1000
        },
        {
          userId,
          type: 'withdrawal',
          status: 'completed',
          amount: 200,
          currency: 'USD',
          netAmount: 195
        },
        {
          userId,
          type: 'deposit',
          status: 'pending',
          amount: 500,
          currency: 'USD',
          netAmount: 500
        }
      ]);
    });
    
    it('should get all transactions', async () => {
      const response = await request(server)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(3);
      expect(response.body.data.pagination).toHaveProperty('total', 3);
    });
    
    it('should filter transactions by type', async () => {
      const response = await request(server)
        .get('/api/v1/wallet/transactions?type=deposit')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
      response.body.data.transactions.forEach(tx => {
        expect(tx.type).toBe('deposit');
      });
    });
    
    it('should filter transactions by status', async () => {
      const response = await request(server)
        .get('/api/v1/wallet/transactions?status=completed')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
      response.body.data.transactions.forEach(tx => {
        expect(tx.status).toBe('completed');
      });
    });
    
    it('should paginate transactions', async () => {
      const response = await request(server)
        .get('/api/v1/wallet/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 2);
      expect(response.body.data.pagination).toHaveProperty('pages', 2);
    });
  });
  
  describe('GET /api/v1/wallet/transactions/:id', () => {
    let transactionId;
    
    beforeEach(async () => {
      // Create a transaction
      const transaction = await Transaction.create({
        userId,
        type: 'deposit',
        status: 'completed',
        amount: 1000,
        currency: 'USD',
        netAmount: 1000,
        description: 'Test deposit'
      });
      
      transactionId = transaction._id;
    });
    
    it('should get specific transaction', async () => {
      const response = await request(server)
        .get(`/api/v1/wallet/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction).toHaveProperty('_id', transactionId.toString());
      expect(response.body.data.transaction).toHaveProperty('amount', 1000);
      expect(response.body.data.transaction).toHaveProperty('currency', 'USD');
    });
    
    it('should not get transaction of another user', async () => {
      // Create another user and transaction
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User'
      });
      
      const otherTransaction = await Transaction.create({
        userId: otherUser._id,
        type: 'deposit',
        status: 'completed',
        amount: 500,
        currency: 'USD',
        netAmount: 500
      });
      
      const response = await request(server)
        .get(`/api/v1/wallet/transactions/${otherTransaction._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});