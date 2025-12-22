const express = require('express');
const Booking = require('../models/Booking.model');
const Customer = require('../models/Customer.model');
const auth = require('../middlewares/auth.middleware');
const { normalizePhone } = require('../utils/phone');

const router = express.Router();

// Admin-only: list bookings with advanced filters
router.get('/', auth, async (req, res) => {
  try {
    // simple role check
    if (!req.admin || !['admin', 'superadmin'].includes(req.admin.role)) return res.status(403).json({ error: 'Forbidden' });

    const { status, service, phone, store, assignedTo, page = 1, limit = 50 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (service) q.service = service;
    if (store) q.store = store;
    if (assignedTo) q.assignedTo = assignedTo;
    if (phone) {
      const c = await Customer.findOne({ phone: normalizePhone(phone) });
      if (c) q.customer = c._id; else q.customer = null;
    }

    if (q.customer === null) delete q.customer;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(200, parseInt(limit, 10) || 50);
    const skip = (p - 1) * lim;

    const [total, bookingsRaw] = await Promise.all([
      Booking.countDocuments(q),
      Booking.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim).populate('customer').populate('product'),
    ]);

    const bookings = (bookingsRaw || []).map((b) => {
      const obj = (typeof b.toObject === 'function') ? b.toObject() : b;
      try {
        if ((!obj.orderSummary || !obj.orderSummary.total) && obj.product) {
          const prod = obj.product;
          const it = {
            productId: prod._id,
            name: prod.name || prod.title || 'Product',
            qty: 1,
            unitPrice: Number(prod.price || 0),
            subtotal: Number(prod.price || 0),
          };
          obj.items = obj.items && obj.items.length ? obj.items : [it];
          obj.orderSummary = obj.orderSummary && obj.orderSummary.items && obj.orderSummary.items.length ? obj.orderSummary : {
            items: [it],
            subtotal: it.subtotal,
            tax: 0,
            shipping: 0,
            total: it.subtotal,
          };
        }
      } catch (e) { /* noop */ }
      return obj;
    });

    res.json({ meta: { total, page: p, limit: lim, pages: Math.ceil(total / lim) }, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch bookings (admin)' });
  }
});

// Admin assign booking
router.post('/:id/assign', auth, async (req, res) => {
  try {
    if (!req.admin || !['admin', 'superadmin'].includes(req.admin.role)) return res.status(403).json({ error: 'Forbidden' });
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ error: 'assignedTo required' });
    const booking = await Booking.findByIdAndUpdate(req.params.id, { assignedTo, status: 'assigned' }, { new: true }).populate('customer');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Emit socket update to order room
    try {
      const io = req.app.get('io');
      if (io) io.to(`order:${booking._id}`).emit('orderStatusUpdate', { orderId: String(booking._id), status: booking.status, updatedAt: new Date().toISOString(), assignedTo });
    } catch (e) { /* noop */ }
    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not assign booking' });
  }
});

// Admin update status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (!req.admin || !['admin', 'superadmin'].includes(req.admin.role)) return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    if (!['pending', 'assigned', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'invalid status' });
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('customer');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Emit socket update to order room
    try {
      const io = req.app.get('io');
      if (io) io.to(`order:${booking._id}`).emit('orderStatusUpdate', { orderId: String(booking._id), status: booking.status, updatedAt: new Date().toISOString() });
    } catch (e) { /* noop */ }
    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update booking status' });
  }
});

// Admin delete booking
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.admin || !['admin', 'superadmin'].includes(req.admin.role)) return res.status(403).json({ error: 'Forbidden' });
    const booking = await Booking.findByIdAndDelete(req.params.id).populate('customer');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Deleted', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete booking' });
  }
});

module.exports = router;
