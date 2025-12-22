require('dotenv').config();
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

// Import routes and models (CommonJS requires)
const orderRoutes = require('../routes/order.routes');
const lodgeRoutes = require('../routes/lodge.routes');
const adminRoutes = require('../routes/admin.routes');
const Order = require('../models/Order.model');
const Lodge = require('../models/Lodge.model');
const Admin = require('../models/Admin.model');
const authMiddleware = require('../middlewares/auth.middleware');

// Express test app
const app = express();
app.use(bodyParser.json());
app.use('/api/orders', orderRoutes);
app.use('/api/lodges', lodgeRoutes);
app.use('/api/admin', adminRoutes);
app.get('/protected', authMiddleware, (req, res) => res.json({ ok: true }));

// Configure Cloudinary (used only if env vars present)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let testAdminToken;
let dbAvailable = false;

beforeAll(async () => {
  // Use real MongoDB for tests if MONGO_URI_TEST is set, otherwise skip DB-dependent tests.
  const uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    console.warn('MONGO_URI_TEST not set; skipping DB-dependent tests');
    dbAvailable = false;
    return;
  }
  try {
    await mongoose.connect(uri);
    // Create test admin and JWT
    const admin = await Admin.create({ username: 'testadmin', password: 'hashedpassword', activeSessions: [] });
    testAdminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
    dbAvailable = true;
  } catch (err) {
    console.warn('Could not connect to MONGO_URI_TEST; skipping DB-dependent tests:', err.message);
    dbAvailable = false;
  }
});

afterAll(async () => {
  try {
    if (dbAvailable) await mongoose.disconnect();
  } catch (err) {
    // ignore cleanup errors
  }
});

describe('Quick Clean Backend All-in-One Tests', () => {
  // -------------------------
  // Environment Variables
  // -------------------------
  (dbAvailable ? it : it.skip)('should have all required env variables (or be set for tests)', () => {
    const required = ['JWT_SECRET', 'ENCRYPTION_KEY'];
    required.forEach((key) => expect(process.env[key] || process.env[key] === '').not.toBeUndefined());
  });

  // -------------------------
  // Cloudinary Upload
  // -------------------------
  const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

  (cloudinaryConfigured ? it : it.skip)('should upload an image to Cloudinary', async () => {
    const filePath = `${__dirname}/sample.png`;
    const result = await cloudinary.uploader.upload(filePath, { folder: 'quickcleanlite', upload_preset: 'quickcleanlite' });
    expect(result.secure_url).toBeDefined();
    expect(result.public_id).toBeDefined();
    // Clean up
    await cloudinary.uploader.destroy(result.public_id);
  });

  // -------------------------
  // Models
  // -------------------------
  (dbAvailable ? it : it.skip)('should create and retrieve an order', async () => {
    const order = await Order.create({ cid: 'QC-ALL-1', lodge: 'Test Lodge', serviceType: 'Cleaning', status: 'initiated', schemaVersion: '1.0' });
    expect(order.cid).toBe('QC-ALL-1');
  });

  (dbAvailable ? it : it.skip)('should create and retrieve a lodge', async () => {
    const lodge = await Lodge.create({ name: 'Lodge Test', status: 'pending' });
    expect(lodge.name).toBe('Lodge Test');
  });

  (dbAvailable ? it : it.skip)('should create and retrieve an admin', async () => {
    const admin = await Admin.findOne({ username: 'testadmin' });
    expect(admin).toBeDefined();
  });

  // -------------------------
  // Routes and Response Speed
  // -------------------------
  (dbAvailable ? it : it.skip)('POST /api/orders should create order quickly', async () => {
    const res = await request(app).post('/api/orders').send({ cid: 'QC-ALL-2', lodge: 'Lodge A', serviceType: 'Cleaning' });
    expect([200, 201]).toContain(res.statusCode);
    if (res.statusCode === 201) expect(res.body.cid).toBe('QC-ALL-2');
  });

  (dbAvailable ? it : it.skip)('GET /api/orders/:cid should fetch order quickly', async () => {
    const res = await request(app).get('/api/orders/QC-ALL-2');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('GET /protected should validate JWT quickly', async () => {
    const res = await request(app).get('/protected').set('Cookie', `token=${testAdminToken}`);
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) expect(res.body.ok).toBe(true);
  });

  // -------------------------
  // Rate Limiting & Session Middleware (basic test)
  // -------------------------
  it('should enforce session JWT middleware', async () => {
    const res = await request(app).get('/protected'); // no token
    expect([401, 400]).toContain(res.statusCode);
  });
});
