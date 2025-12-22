jest.setTimeout(30000); // 30 seconds
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');

const bookingRoutes = require('../routes/booking');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());
// mount at root so route paths like POST /booking and GET /bookings match
app.use('/', bookingRoutes);

beforeAll(async () => {
  // Use real MongoDB for tests. Prefer MONGO_URI_TEST, fall back to DB_URI (server DB)
  const uri = process.env.MONGO_URI_TEST || process.env.DB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error('Please set MONGO_URI_TEST or DB_URI in your .env for tests');
  await mongoose.connect(uri);
  await Customer.deleteMany({});
  await Booking.deleteMany({});
});

afterAll(async () => {
  // Drop test database and disconnect
  try {
    await mongoose.connection.dropDatabase();
  } catch (e) {
    // ignore
  }
  await mongoose.disconnect();
});

describe('Booking API', () => {

  let customerPhone = '08033005971';

  test('Create bookings successfully', async () => {
    const res = await request(app)
      .post('/booking')
      .send({
        name: 'Obi Joy',
        phone: customerPhone,
        services: [
          { service: 'Lodge Clean', price: 5000 },
          { service: 'Help Me Buy Pack', price: 1500, store: 'Shoprite Ifite' }
        ]
      });
    if (res.statusCode !== 201) console.error('Create failed response body:', res.body);
    expect(res.statusCode).toBe(201);
    expect(res.body.bookings.length).toBe(2);
    expect(res.body.bookings[0]).toHaveProperty('service', 'Lodge Clean');
    expect(res.body.bookings[1]).toHaveProperty('store', 'Shoprite Ifite');
  });

  test('Fail booking with invalid phone', async () => {
    const res = await request(app)
      .post('/booking')
      .send({
        name: 'Invalid User',
        phone: '123abc',
        services: [{ service: 'Lodge Clean', price: 5000 }]
      });
    if (res.statusCode !== 400) console.error('Invalid-phone test unexpected body:', res.body);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors && res.body.errors[0] && res.body.errors[0].param).toBe('phone');
  });

  test('List bookings with populated customer', async () => {
    const res = await request(app).get('/bookings');
    expect(res.statusCode).toBe(200);
    // our route returns { bookings: [...] }
    expect(Array.isArray(res.body.bookings)).toBe(true);
    expect(res.body.bookings[0]).toHaveProperty('customer');
    expect(res.body.bookings[0].customer).toHaveProperty('name', 'Obi Joy');
  });

  test('Assign admin to booking', async () => {
    const booking = await Booking.findOne({ service: 'Lodge Clean' });
    const res = await request(app)
      .patch(`/booking/${booking._id}/assign`)
      .send({ assignedTo: 'Admin1' });

    expect(res.statusCode).toBe(200);
    // route returns { booking }
    expect(res.body.booking).toHaveProperty('assignedTo', 'Admin1');
  });

  test('Update booking status', async () => {
    const booking = await Booking.findOne({ service: 'Help Me Buy Pack' });
    const res = await request(app)
      .patch(`/booking/${booking._id}/status`)
      .send({ status: 'in-progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.booking).toHaveProperty('status', 'in-progress');
  });

});
