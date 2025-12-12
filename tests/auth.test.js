import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';

let mongoServer;
let server;

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
  // Clear database before each test
  await User.deleteMany({});
});

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      };
      
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).toHaveProperty('firstName', userData.firstName);
      expect(response.body.data.user).toHaveProperty('lastName', userData.lastName);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });
    
    it('should not register user with existing email', async () => {
      // Create user first
      await User.create({
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Existing',
        lastName: 'User'
      });
      
      const userData = {
        email: 'existing@example.com', // Same email
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User'
      };
      
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(userData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
    
    it('should validate required fields', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
  
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await User.create({
        email: 'login@example.com',
        password: 'Password123!',
        firstName: 'Login',
        lastName: 'User'
      });
    });
    
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'Password123!'
      };
      
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(loginData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email', loginData.email);
      expect(response.body.data).toHaveProperty('token');
    });
    
    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword123!'
      };
      
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(loginData);
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
    
    it('should not login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };
      
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(loginData);
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/auth/profile', () => {
    let authToken;
    
    beforeEach(async () => {
      // Create user and get token
      const user = await User.create({
        email: 'profile@example.com',
        password: 'Password123!',
        firstName: 'Profile',
        lastName: 'User'
      });
      
      // Generate token
      authToken = user.generateAuthToken();
    });
    
    it('should get profile with valid token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email', 'profile@example.com');
      expect(response.body.data.user).toHaveProperty('firstName', 'Profile');
    });
    
    it('should not get profile without token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should not get profile with invalid token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PUT /api/v1/auth/profile', () => {
    let authToken;
    let userId;
    
    beforeEach(async () => {
      // Create user and get token
      const user = await User.create({
        email: 'update@example.com',
        password: 'Password123!',
        firstName: 'Original',
        lastName: 'User',
        phone: '+1234567890'
      });
      
      authToken = user.generateAuthToken();
      userId = user._id;
    });
    
    it('should update profile with valid data', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+0987654321'
      };
      
      const response = await request(server)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('firstName', 'Updated');
      expect(response.body.data.user).toHaveProperty('lastName', 'Name');
      expect(response.body.data.user).toHaveProperty('phone', '+0987654321');
    });
    
    it('should not update with invalid data', async () => {
      const updateData = {
        email: 'invalid-email' // Can't change email in this endpoint
      };
      
      const response = await request(server)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PUT /api/v1/auth/password/change', () => {
    let authToken;
    
    beforeEach(async () => {
      // Create user
      const user = await User.create({
        email: 'password@example.com',
        password: 'OldPassword123!',
        firstName: 'Password',
        lastName: 'User'
      });
      
      authToken = user.generateAuthToken();
    });
    
    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };
      
      const response = await request(server)
        .put('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify new password works
      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'password@example.com',
          password: 'NewPassword123!'
        });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });
    
    it('should not change password with invalid current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };
      
      const response = await request(server)
        .put('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should validate new password strength', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak'
      };
      
      const response = await request(server)
        .put('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);
      
      expect(response.status).toBe(500); // Will fail validation in controller
    });
  });
});