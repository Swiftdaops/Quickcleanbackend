const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const stores = require('../data/stores');
const { normalizePhone } = require('../utils/phone');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return next();
}

// Handler for creating bookings (used for both '/booking' and '/')
async function createBookingsHandler(req, res) {
  try {
    const { name, phone, services } = req.body;
    const norm = normalizePhone(phone);

    // Use upsert to avoid duplicate-key errors when creating customers concurrently
    const customer = await Customer.findOneAndUpdate(
      { phone: norm },
      { $setOnInsert: { name: String(name).trim(), phone: norm } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const created = [];
    for (const s of services) {
      const b = await Booking.create({
        customer: customer._id,
        service: s.service,
        price: s.price,
        store: s.store,
        notes: s.notes || undefined,
      });
      await b.populate('customer');
      created.push(b);
    }

    return res.status(201).json({ message: 'Bookings created', bookings: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create bookings', details: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}

// POST /booking and POST / (when mounted at /booking) - create one or more bookings for a customer
router.post(
  '/',
  body('name').isString().trim().notEmpty(),
  body('phone').isString().trim().matches(/^\+?\d{10,15}$/).withMessage('phone must be 10-15 digits'),
  body('services').isArray({ min: 1 }).withMessage('services must be a non-empty array'),
  body('services.*.service').isIn(['Lodge Clean', 'Help Me Buy Pack', 'Home & Apartment']),
  body('services.*.price').isFloat({ gt: 0 }).withMessage('price must be a number > 0'),
  body('services.*.store').optional().isString().custom((val, { req, path }) => {
    // store is only allowed for Help Me Buy Pack
    const idx = path.match(/services\.(\d+)\.store/)[1];
    const service = req.body.services[idx].service;
    if (service !== 'Help Me Buy Pack' && val) throw new Error('store only allowed for Help Me Buy Pack');
    if (service === 'Help Me Buy Pack' && val && !stores.includes(val)) throw new Error('invalid store');
    return true;
  }),
  handleValidation,
  createBookingsHandler
);

// Also expose POST /booking for tests mounting router at root
router.post('/booking',
  body('name').isString().trim().notEmpty(),
  body('phone').isString().trim().matches(/^\+?\d{10,15}$/).withMessage('phone must be 10-15 digits'),
  body('services').isArray({ min: 1 }).withMessage('services must be a non-empty array'),
  body('services.*.service').isIn(['Lodge Clean', 'Help Me Buy Pack', 'Home & Apartment']),
  body('services.*.price').isFloat({ gt: 0 }).withMessage('price must be a number > 0'),
  body('services.*.store').optional().isString().custom((val, { req, path }) => {
    const idx = path.match(/services\.(\d+)\.store/)[1];
    const service = req.body.services[idx].service;
    if (service !== 'Help Me Buy Pack' && val) throw new Error('store only allowed for Help Me Buy Pack');
    if (service === 'Help Me Buy Pack' && val && !stores.includes(val)) throw new Error('invalid store');
    return true;
  }),
  handleValidation,
  createBookingsHandler
);

// GET / (when mounted at /booking) - list bookings with populated customer (returns array)
async function listBookingsHandler(req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).populate('customer');
    // return wrapped object for compatibility with existing tests
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch bookings' });
  }
}

// GET / and GET /bookings
router.get('/', listBookingsHandler);
router.get('/bookings', listBookingsHandler);

// PATCH /:id/assign - assign staff/admin to booking
// Keep both '/:id/assign' and '/booking/:id/assign' for compatibility
router.patch(
  '/:id/assign',
  param('id').isMongoId(),
  body('assignedTo').isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const booking = await Booking.findByIdAndUpdate(id, { assignedTo, status: 'in-progress' }, { new: true }).populate('customer');
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      try {
        const io = req.app.get('io');
        if (io) io.to(`order:${booking._id}`).emit('orderStatusUpdate', { orderId: String(booking._id), status: booking.status, updatedAt: new Date().toISOString(), assignedTo });
      } catch (e) { /* noop */ }
      res.json({ booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Could not assign booking' });
    }
  }
);

router.patch(
  '/booking/:id/assign',
  param('id').isMongoId(),
  body('assignedTo').isString().trim().notEmpty(),
  handleValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const booking = await Booking.findByIdAndUpdate(id, { assignedTo, status: 'in-progress' }, { new: true }).populate('customer');
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      res.json({ booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Could not assign booking' });
    }
  }
);

// PATCH /:id/status - update booking status
router.patch(
  '/:id/status',
  param('id').isMongoId(),
  body('status').isIn(['pending', 'in-progress', 'completed']),
  handleValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true }).populate('customer');
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      try {
        const io = req.app.get('io');
        if (io) io.to(`order:${booking._id}`).emit('orderStatusUpdate', { orderId: String(booking._id), status: booking.status, updatedAt: new Date().toISOString() });
      } catch (e) { /* noop */ }
      res.json({ booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Could not update status' });
    }
  }
);

router.patch(
  '/booking/:id/status',
  param('id').isMongoId(),
  body('status').isIn(['pending', 'in-progress', 'completed']),
  handleValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true }).populate('customer');
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      try {
        const io = req.app.get('io');
        if (io) io.to(`order:${booking._id}`).emit('orderStatusUpdate', { orderId: String(booking._id), status: booking.status, updatedAt: new Date().toISOString() });
      } catch (e) { /* noop */ }
      res.json({ booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Could not update status' });
    }
  }
);

module.exports = router;
