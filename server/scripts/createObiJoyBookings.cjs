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
app.use('/booking', bookingRoutes);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  await Customer.deleteMany({});
  await Booking.deleteMany({});
});

afterAll(async () => {
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

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].param).toBe('phone');
  });

  test('List bookings with populated customer', async () => {
    const res = await request(app).get('/booking');
    expect(res.statusCode).toBe(200);
    expect(res.body[0]).toHaveProperty('customer');
    expect(res.body[0].customer).toHaveProperty('name', 'Obi Joy');
  });

  test('Assign admin to booking', async () => {
    const booking = await Booking.findOne({ service: 'Lodge Clean' });
    const res = await request(app)
      .patch(`/booking/${booking._id}/assign`)
      .send({ assignedTo: 'Admin1' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('assignedTo', 'Admin1');
  });

  test('Update booking status', async () => {
    const booking = await Booking.findOne({ service: 'Help Me Buy Pack' });
    const res = await request(app)
      .patch(`/booking/${booking._id}/status`)
      .send({ status: 'in-progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'in-progress');
  });

});
